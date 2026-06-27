using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fishtank.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCaptureFullHeaders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CaptureFullHeaders",
                table: "ServerConfigs",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CaptureFullHeaders",
                table: "ServerConfigs");
        }
    }
}
