import re

file_path = r'c:\GIT\_Personal\fishtank\src\Fishtank.Api\Endpoints\AuthEndpoints.cs'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the helpers section and insert handlers before it
helpers_marker = '    // ─── helpers ───'
insert_point = content.find(helpers_marker)

if insert_point == -1:
    print('Error: helpers marker not found')
    exit(1)

handlers = '''    // ─── handlers for registration ────────────────────────────────────────────────────

    /// <summary>
    /// AC-11: GET /api/auth/registration-status (PUBLIC)
    /// Returns whether auto-registration is enabled
    /// </summary>
    private static async Task<IResult> GetRegistrationStatusHandler(
        IFeatureToggleService toggleService,
        CancellationToken ct)
    {
        var toggles = await toggleService.GetAllTogglesAsync(ct);
        var autoRegToggle = toggles.FirstOrDefault(t => t.Name == "auto_registration");
        var enabled = autoRegToggle?.Enabled ?? false;

        var response = new RegistrationStatusDto(Enabled: enabled);
        return Results.Ok(ApiResponse.Ok(response));
    }

    /// <summary>
    /// AC-10: POST /api/auth/register (PUBLIC)
    /// Creates a Standard User account if auto_registration toggle is enabled
    /// </summary>
    private static async Task<IResult> RegisterHandler(
        RegisterRequest req,
        IFeatureToggleService toggleService,
        IUserManagementService userService,
        IAuthService auth,
        IServerConfigService configService,
        FishtankDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        // Check auto_registration toggle
        var toggles = await toggleService.GetAllTogglesAsync(ct);
        var autoRegToggle = toggles.FirstOrDefault(t => t.Name == "auto_registration");
        if (autoRegToggle?.Enabled != true)
        {
            return Results.Json(
                ApiResponse.Fail("AUTH_REGISTRATION_DISABLED", "User registration is currently disabled."),
                statusCode: StatusCodes.Status403Forbidden);
        }

        // Validate password length (≥12 chars)
        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 12)
        {
            return Results.Json(
                ApiResponse.Fail("AUTH_PASSWORD_TOO_SHORT", "Password must be at least 12 characters."),
                statusCode: StatusCodes.Status400BadRequest);
        }

        // Validate username
        if (string.IsNullOrWhiteSpace(req.Username))
        {
            return Results.Json(
                ApiResponse.Fail("VALIDATION_ERROR", "Username is required."),
                statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            // AC-10: actorId is Guid.Empty for self-registration (no actor)
            var userDto = await userService.CreateUserAsync(req.Username, req.Password, Guid.Empty, ct);

            // AC-10: Self-registered users should NOT be forced to change password
            // Update the user to set ForcePasswordChange=false
            var user = await db.Users.FindAsync(new object[] { userDto.Id }, ct);
            if (user is not null)
            {
                user.ForcePasswordChange = false;
                await db.SaveChangesAsync(ct);
            }

            // Issue JWT and set cookie
            var bootEpoch = await configService.GetBootEpochAsync();
            var token = auth.IssueJwt(user!, bootEpoch);
            SetJwtCookie(ctx.Response, token, IsProduction(ctx));

            return Results.Json(ApiResponse.Ok(new
            {
                username = userDto.Username,
                role = userDto.Role
            }));
        }
        catch (Exceptions.ValidationException ex)
        {
            return Results.Json(
                ApiResponse.Fail(ex.ErrorCode, ex.Message),
                statusCode: StatusCodes.Status400BadRequest);
        }
        catch (Exceptions.ConflictException ex)
        {
            return Results.Json(
                ApiResponse.Fail(ex.ErrorCode, ex.Message),
                statusCode: StatusCodes.Status409Conflict);
        }
    }

'''

new_content = content[:insert_point] + handlers + content[insert_point:]

# Add RegisterRequest to the end
new_content = new_content.rstrip() + '\npublic record RegisterRequest(string? Username, string? Password);\n'

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_content)

print('Handlers and DTO added successfully')
