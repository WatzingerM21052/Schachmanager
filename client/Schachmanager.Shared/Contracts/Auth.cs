namespace Schachmanager.Shared.Contracts;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = new();
}

public class UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Role { get; set; } = "Member"; // Admin | Organizer | Member
    public bool IsActive { get; set; }
    public string? CreatedAt { get; set; }
    public string? LastLogin { get; set; }
}

public class CreateUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Role { get; set; } = "Member";
}

public class CreateUserResponse : UserDto
{
    public string GeneratedPassword { get; set; } = string.Empty;
}

public class UpdateUserRequest
{
    public string? Email { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
}

public class ResetPasswordResponse
{
    public string GeneratedPassword { get; set; } = string.Empty;
}

public class ApiErrorResponse
{
    public string Error { get; set; } = string.Empty;
}
