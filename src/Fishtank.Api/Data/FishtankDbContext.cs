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
    public DbSet<FeatureToggle> FeatureToggles => Set<FeatureToggle>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

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

        modelBuilder.Entity<FeatureToggle>()
            .HasIndex(t => t.Name).IsUnique();

        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.CreatedAt);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.Actor)
            .WithMany()
            .HasForeignKey(a => a.ActorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
