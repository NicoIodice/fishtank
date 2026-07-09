using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fishtank.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFeatureToggles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FeatureToggles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureToggles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeatureToggles_Name",
                table: "FeatureToggles",
                column: "Name",
                unique: true);

            // Seed known toggles (all enabled by default per FR-30) using raw SQL
            migrationBuilder.Sql(@"
                INSERT INTO FeatureToggles (Id, Name, DisplayName, Description, Enabled, UpdatedAt)
                VALUES 
                    ('11111111-1111-1111-1111-111111111111', 'network_activity', 'Network Activity', 'Real-time request monitoring', 1, '2026-07-09 00:00:00+00:00'),
                    ('22222222-2222-2222-2222-222222222222', 'mappings_editor', 'Mappings Editor', 'File explorer and editor', 1, '2026-07-09 00:00:00+00:00'),
                    ('33333333-3333-3333-3333-333333333333', 'record_mode', 'Record Mode', 'Auto-capture proxied requests', 1, '2026-07-09 00:00:00+00:00'),
                    ('44444444-4444-4444-4444-444444444444', 'system_events', 'System Events', 'Infrastructure event log', 1, '2026-07-09 00:00:00+00:00'),
                    ('55555555-5555-5555-5555-555555555555', 'services_management', 'Services Management', 'Service CRUD operations', 1, '2026-07-09 00:00:00+00:00')
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeatureToggles");
        }
    }
}
