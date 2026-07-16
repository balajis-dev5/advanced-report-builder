<?php

namespace App\Services\Export;

/**
 * An in-memory exported file: raw bytes plus the metadata needed to stream it
 * as a download or persist it for a scheduled delivery.
 */
class ExportedFile
{
    public function __construct(
        public readonly string $filename,
        public readonly string $mimeType,
        public readonly string $contents,
    ) {
    }
}
