using Fishtank.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Fishtank.Api.Data;

public class FishtankDbContext(DbContextOptions<FishtankDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ServerConfig> ServerConfigs => Set<ServerConfig>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<SystemEvent> SystemEvents => Set<SystemEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username).IsUnique();

        modelBuilder.Entity<Service>()
            .HasIndex(s => s.Slug).IsUnique();

        modelBuilder.Entity<SystemEvent>()
            .HasOne(e => e.Service)
            .WithMany()
            .HasForeignKey(e => e.ServiceId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
