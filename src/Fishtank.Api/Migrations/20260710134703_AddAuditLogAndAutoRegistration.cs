using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fishtank.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogAndAutoRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Action = table.Column<string>(type: "TEXT", nullable: false),
                    ActorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ResourceType = table.Column<string>(type: "TEXT", nullable: false),
                    ResourceId = table.Column<string>(type: "TEXT", nullable: true),
                    Details = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_ActorId",
                        column: x => x.ActorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorId",
                table: "AuditLogs",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            // Seed auto_registration toggle (Story 5.3)
            migrationBuilder.InsertData(
                table: "FeatureToggles",
                columns: new[] { "Id", "Name", "DisplayName", "Description", "Enabled", "UpdatedAt" },
                values: new object[] { new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), "auto_registration", "User Self-Registration", "Allow new accounts to be created via the registration page. New accounts are Standard User role.", false, DateTimeOffset.UtcNow });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove auto_registration toggle
            migrationBuilder.DeleteData(
                table: "FeatureToggles",
                keyColumn: "Name",
                keyValue: "auto_registration");

            migrationBuilder.DropTable(
                name: "AuditLogs");
        }
    }
}
