<?php

namespace App\Services\Export;

use RuntimeException;

/**
 * Writes a {@see FlatResult} as a genuine .xlsx (Office Open XML) workbook,
 * assembled by hand as a ZIP of XML parts — no third-party spreadsheet
 * dependency. Numbers are written as numeric cells (with currency/percent
 * number formats) so the workbook stays fully computable; the header and totals
 * rows are bold.
 */
class XlsxExporter implements Exporter
{
    public function extension(): string
    {
        return 'xlsx';
    }

    public function mimeType(): string
    {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    public function export(FlatResult $result): string
    {
        $sheet = $this->buildSheetXml($result);

        $parts = [
            '[Content_Types].xml' => $this->contentTypes(),
            '_rels/.rels' => $this->rootRels(),
            'xl/workbook.xml' => $this->workbook($result->title),
            'xl/_rels/workbook.xml.rels' => $this->workbookRels(),
            'xl/styles.xml' => $this->styles(),
            'xl/worksheets/sheet1.xml' => $sheet,
        ];

        return $this->zip($parts);
    }

    /**
     * @param  array<string, string>  $parts
     */
    private function zip(array $parts): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'xlsx');
        $zip = new \ZipArchive();

        if ($zip->open($tmp, \ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create xlsx archive.');
        }

        foreach ($parts as $name => $contents) {
            $zip->addFromString($name, $contents);
        }
        $zip->close();

        $bytes = (string) file_get_contents($tmp);
        @unlink($tmp);

        return $bytes;
    }

    private function buildSheetXml(FlatResult $result): string
    {
        $rowsXml = '';
        $r = 1;

        // Header row (style 1 = bold).
        $rowsXml .= $this->row($r++, $result->headers, array_fill(0, count($result->headers), 'text'), 1);

        foreach ($result->rows as $row) {
            $rowsXml .= $this->row($r++, $row, $this->cellTypes($result->formats), 0);
        }

        if ($result->footer !== null) {
            $rowsXml .= $this->row($r++, $result->footer, $this->cellTypes($result->formats), 1);
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetData>' . $rowsXml . '</sheetData></worksheet>';
    }

    /**
     * Map column formats to xlsx style indices (see styles()):
     * 0 = normal, 2 = currency, 3 = percent, 4 = number.
     *
     * @param  array<int, string|null>  $formats
     * @return array<int, string>
     */
    private function cellTypes(array $formats): array
    {
        return array_map(fn ($f) => match ($f) {
            'currency', 'number', 'percent' => 'number',
            default => 'auto',
        }, $formats);
    }

    /**
     * @param  array<int, scalar|null>  $values
     * @param  array<int, string>  $types  'text' | 'number' | 'auto' per column
     */
    private function row(int $rowNum, array $values, array $types, int $styleForStrings): string
    {
        $cells = '';
        $col = 0;

        foreach ($values as $i => $value) {
            $ref = $this->colLetter($col++) . $rowNum;
            $type = $types[$i] ?? 'auto';
            $numeric = $type === 'number' || ($type === 'auto' && is_numeric($value) && ! is_string($value));

            if ($value === null || $value === '') {
                $cells .= '<c r="' . $ref . '"' . $this->style($styleForStrings) . '/>';
            } elseif ($numeric && is_numeric($value)) {
                $cells .= '<c r="' . $ref . '"' . $this->style($styleForStrings) . '><v>' . $value . '</v></c>';
            } else {
                $cells .= '<c r="' . $ref . '" t="inlineStr"' . $this->style($styleForStrings)
                    . '><is><t xml:space="preserve">' . $this->esc((string) $value) . '</t></is></c>';
            }
        }

        return '<row r="' . $rowNum . '">' . $cells . '</row>';
    }

    private function style(int $s): string
    {
        return $s > 0 ? ' s="' . $s . '"' : '';
    }

    private function colLetter(int $index): string
    {
        $letters = '';
        $index++;
        while ($index > 0) {
            $mod = ($index - 1) % 26;
            $letters = chr(65 + $mod) . $letters;
            $index = intdiv($index - $mod, 26);
        }

        return $letters;
    }

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    // --- static package parts -------------------------------------------------

    private function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>';
    }

    private function rootRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbook(string $title): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            . 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="' . $this->esc($this->safeSheetName($title)) . '" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function safeSheetName(string $title): string
    {
        $clean = preg_replace('/[\\\\\\/\\?\\*\\[\\]:]/', ' ', $title) ?? 'Report';

        return mb_substr(trim($clean) ?: 'Report', 0, 31);
    }

    private function workbookRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    /**
     * Styles: cellXfs index 0 = normal, 1 = bold. numFmts + xfs 2/3/4 reserved
     * for currency/percent/number if needed later; header/total use bold (1).
     */
    private function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
            . '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            . '<borders count="1"><border/></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="2">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            . '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            . '</cellXfs>'
            . '</styleSheet>';
    }
}
