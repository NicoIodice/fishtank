# Stage 1: Build React client
FROM node:22-alpine AS client-build
WORKDIR /src/client
COPY src/client/package*.json ./
RUN npm ci
COPY src/client/ ./
RUN npm run build

# Stage 2: Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS server-build
WORKDIR /src
COPY src/ ./
RUN dotnet publish Fishtank.Api/Fishtank.Api.csproj -c Release -o /app/publish

# Stage 3: Runtime (Alpine + non-root user)
# APP_VERSION is injected by docker.yml CI workflow from the release branch name.
# Defaults to 'dev' for local builds.
ARG APP_VERSION=dev
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
# libgcc and libstdc++ are required by Microsoft.Data.Sqlite's native binary on Alpine
RUN apk add --no-cache libgcc libstdc++
RUN addgroup -S fishtank && adduser -S fishtank -G fishtank
WORKDIR /app
COPY --from=server-build /app/publish ./
COPY --from=client-build /src/client/dist ./wwwroot
# Create the data directory for SQLite and transfer ownership before switching user
RUN mkdir -p /app/data && chown -R fishtank:fishtank /app
USER fishtank
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV APP_VERSION=$APP_VERSION
ENTRYPOINT ["dotnet", "Fishtank.Api.dll"]
