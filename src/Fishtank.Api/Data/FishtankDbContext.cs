using Fishtank.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Data;

public class FishtankDbContext(DbContextOptions<FishtankDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ServerConfig> ServerConfigs => Set<ServerConfig>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username).IsUnique();
    }
}
