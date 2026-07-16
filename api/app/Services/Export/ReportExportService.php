<?php

namespace App\Services\Export;

use App\Services\Reporting\ReportCompiler;
use App\Services\Reporting\ReportDefinitionException;
use InvalidArgumentException;

/**
 * Front door for exports: compiles a report definition, flattens the result,
 * and hands it to the writer for the requested format. Returns an
 * {@see ExportedFile} (bytes + filename + mime) ready to stream or persist.
 */
class ReportExportService
{
    public const FORMATS = ['csv', 'xlsx', 'pdf'];

    public function __construct(
        private readonly ReportCompiler $compiler,
        private readonly ResultFlattener $flattener,
    ) {
    }

    /**
     * @param  array<string, mixed>  $config
     *
     * @throws ReportDefinitionException  on an invalid definition
     * @throws InvalidArgumentException   on an unknown format
     */
    public function export(
        string $dataSource,
        string $type,
        array $config,
        string $format,
        string $title,
    ): ExportedFile {
        $exporter = $this->exporterFor($format);

        $result = $this->compiler->run($dataSource, $type, $config);
        $flat = $this->flattener->flatten($result, $title);
        $bytes = $exporter->export($flat);

        return new ExportedFile(
            filename: $this->filename($title, $exporter->extension()),
            mimeType: $exporter->mimeType(),
            contents: $bytes,
        );
    }

    private function exporterFor(string $format): Exporter
    {
        return match ($format) {
            'csv' => new CsvExporter(),
            'xlsx' => new XlsxExporter(),
            'pdf' => new PdfExporter(),
            default => throw new InvalidArgumentException("Unsupported export format: {$format}"),
        };
    }

    private function filename(string $title, string $extension): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $title) ?? 'report', '-'));
        $slug = $slug !== '' ? $slug : 'report';

        return $slug . '-' . now()->format('Ymd') . '.' . $extension;
    }
}
