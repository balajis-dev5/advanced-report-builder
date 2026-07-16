<?php

namespace App\Services\Export;

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Renders a {@see FlatResult} to a print-ready PDF via dompdf. Numbers are
 * formatted for reading (currency, percent, thousands separators) and the
 * header/totals rows are emphasised.
 */
class PdfExporter implements Exporter
{
    public function extension(): string
    {
        return 'pdf';
    }

    public function mimeType(): string
    {
        return 'application/pdf';
    }

    public function export(FlatResult $result): string
    {
        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($this->html($result));
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        return (string) $dompdf->output();
    }

    private function html(FlatResult $result): string
    {
        $title = htmlspecialchars($result->title, ENT_QUOTES, 'UTF-8');
        $generated = now()->format('M j, Y g:i A');

        $head = '';
        foreach ($result->headers as $i => $header) {
            $align = $result->aligns[$i] ?? 'left';
            $head .= '<th class="' . $align . '">' . htmlspecialchars($header, ENT_QUOTES, 'UTF-8') . '</th>';
        }

        $body = '';
        foreach ($result->rows as $row) {
            $body .= '<tr>' . $this->cells($row, $result) . '</tr>';
        }

        $foot = '';
        if ($result->footer !== null) {
            $foot = '<tr class="totals">' . $this->cells($result->footer, $result) . '</tr>';
        }

        return <<<HTML
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><style>
            * { font-family: Helvetica, Arial, sans-serif; }
            body { margin: 0; color: #18181b; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin-bottom: 14px; }
            .header h1 { font-size: 16px; margin: 0 0 2px; }
            .header .meta { font-size: 9px; color: #71717a; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th, td { padding: 5px 7px; border-bottom: 1px solid #e4e4e7; }
            th { background: #f4f4f5; color: #3f3f46; text-transform: uppercase; font-size: 8px; letter-spacing: .04em; }
            .left { text-align: left; } .right { text-align: right; }
            tr.totals td { border-top: 2px solid #a1a1aa; font-weight: bold; background: #fafafa; }
            .footer { margin-top: 12px; font-size: 8px; color: #a1a1aa; }
        </style></head><body>
            <div class="header">
                <h1>{$title}</h1>
                <div class="meta">Generated {$generated} · Advanced Report Builder</div>
            </div>
            <table><thead><tr>{$head}</tr></thead><tbody>{$body}{$foot}</tbody></table>
            <div class="footer">Advanced Report Builder — automated report export.</div>
        </body></html>
        HTML;
    }

    private function cells(array $row, FlatResult $result): string
    {
        $html = '';
        foreach ($row as $i => $value) {
            $align = $result->aligns[$i] ?? 'left';
            // A totals footer's leading "Total" label should stay unformatted.
            $format = is_numeric($value) ? ($result->formats[$i] ?? null) : null;
            $display = ValueFormatter::display($value, $format);
            $html .= '<td class="' . $align . '">' . htmlspecialchars($display, ENT_QUOTES, 'UTF-8') . '</td>';
        }

        return $html;
    }
}
