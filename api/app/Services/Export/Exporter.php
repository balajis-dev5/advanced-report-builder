<?php

namespace App\Services\Export;

/**
 * A format-specific writer that turns a normalised {@see FlatResult} into a
 * downloadable byte string.
 */
interface Exporter
{
    /** File extension without the dot, e.g. "csv". */
    public function extension(): string;

    /** HTTP content type for the download. */
    public function mimeType(): string;

    /** Render the result to raw file bytes. */
    public function export(FlatResult $result): string;
}
