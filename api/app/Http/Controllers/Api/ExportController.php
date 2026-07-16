<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\Export\ReportExportService;
use App\Services\Reporting\ReportDefinitionException;
use App\Support\ReportAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams report results as CSV / XLSX / PDF downloads — both for ad-hoc
 * definitions (the live preview) and for saved reports.
 */
class ExportController extends Controller
{
    public function __construct(private readonly ReportExportService $exporter)
    {
    }

    /**
     * Export an ad-hoc definition without saving it.
     */
    public function runExport(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'data_source' => ['required', 'string'],
            'type' => ['required', Rule::in(Report::TYPES)],
            'config' => ['required', 'array'],
            'format' => ['required', Rule::in(ReportExportService::FORMATS)],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        return $this->stream(
            $validated['data_source'],
            $validated['type'],
            $validated['config'],
            $validated['format'],
            $validated['name'] ?? 'Report',
        );
    }

    /**
     * Export a saved report the user owns or has been given access to.
     */
    public function exportSaved(Request $request, Report $report): StreamedResponse
    {
        abort_unless(ReportAccess::canView($request->user(), $report), 404);

        $format = $request->query('format', 'csv');
        abort_unless(in_array($format, ReportExportService::FORMATS, true), 422, 'Unsupported format.');

        return $this->stream($report->data_source, $report->type, $report->config, $format, $report->name);
    }

    private function stream(string $source, string $type, array $config, string $format, string $title): StreamedResponse
    {
        try {
            $file = $this->exporter->export($source, $type, $config, $format, $title);
        } catch (ReportDefinitionException $e) {
            abort(422, $e->getMessage());
        }

        return Response::streamDownload(
            fn () => print($file->contents),
            $file->filename,
            [
                'Content-Type' => $file->mimeType,
                'Content-Length' => (string) strlen($file->contents),
            ],
        );
    }
}
