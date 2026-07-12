<?php

namespace App\Services\Reporting;

use RuntimeException;

/**
 * Thrown when a report definition references fields, operators, or aggregations
 * that are not permitted by the DataSourceRegistry, or is otherwise malformed.
 *
 * The API layer maps this to a 422 response — it always represents bad input,
 * never a server fault.
 */
class ReportDefinitionException extends RuntimeException
{
}
