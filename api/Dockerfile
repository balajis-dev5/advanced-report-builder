# Production image for the ARB API (Render/any Docker host).
#
# Deliberately simple for a demo deployment: SQLite lives inside the container
# filesystem, so every fresh deploy starts from a clean, freshly seeded demo
# database. php artisan serve is the built-in CLI server — plenty for a
# portfolio demo; swap for FrankenPHP/FPM+nginx before real traffic.
FROM php:8.4-cli-alpine

# ext-zip is the only extension the app needs beyond the image defaults
# (the XLSX exporter builds its SpreadsheetML package with ZipArchive).
RUN apk add --no-cache libzip-dev unzip git \
    && docker-php-ext-install zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Install dependencies first so this layer caches across code-only changes.
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts

COPY . .
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi

ENV APP_ENV=production \
    APP_DEBUG=false \
    PHP_CLI_SERVER_WORKERS=8

EXPOSE 8080

CMD ["sh", "docker/start.sh"]
