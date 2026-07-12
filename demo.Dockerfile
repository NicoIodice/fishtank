ARG VERSION=latest
FROM nicoiodice/fishtank:${VERSION}

# Copy demo WireMock mapping files
COPY resources/demo-mocks/ /app/mocks/

# Copy demo seed file
COPY resources/demo-seed.json /data/demo-seed.json

# Copy first-run setup script
COPY resources/demo-entrypoint.sh /usr/local/bin/demo-entrypoint.sh

# Fix permissions (must temporarily be root)
USER root
RUN chown -R fishtank:fishtank /app/mocks /data && \
    chmod +x /usr/local/bin/demo-entrypoint.sh
USER fishtank

ENV FISHTANK_SEED_FILE=/data/demo-seed.json

ENTRYPOINT ["/usr/local/bin/demo-entrypoint.sh"]
