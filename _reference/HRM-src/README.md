# HRM - Human Resource Management System
A complete Human Resource Management System developed with ASP.NET Core MVC, designed to simplify and automate HR operations like employee management, leave tracking, and payroll.

# 🛠️ Tech Stack
ASP.NET Core MVC (.NET 6 / .NET 7)

Entity Framework Core (Code First Migrations)

SQL Server

Bootstrap, jQuery (via wwwroot/)

C#

# ✨ Features
User Authentication and Authorization

Employee Registration and Management

Department and Designation Management

Attendance and Leave Management

Payroll Management

Reports Generation

Real-time Notifications (via Hub/)

Role-Based Access Control (RBAC)

# 📦 Project Structure
lua
Copy
Edit
/Controllers   --> Handles application logic
/Models        --> Defines data structures
/Views         --> UI Pages (Razor views)
/Services      --> Business logic and data services
/wwwroot       --> Static files (CSS, JS, Images)
/Migrations    --> EF Core Migrations
# 🚀 Getting Started
Clone the repository:

bash
Copy
Edit
git clone https://github.com/your-username/hrm.git
Open the solution itgsgroup.sln in Visual Studio 2022 or newer.

Restore NuGet packages automatically on build.

Update the database connection string in appsettings.json:

json
Copy
Edit
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=YourDatabaseName;Trusted_Connection=True;"
}
Apply Migrations to the Database:

bash
Copy
Edit
Update-Database
Run the project (F5) and enjoy!

# 📸 Screenshots

![Screenshot (34)](https://github.com/user-attachments/assets/3c4ef736-61be-48e9-b49b-80de957b701a)
![Screenshot (33)](https://github.com/user-attachments/assets/b3da4ba7-cb6b-4eba-ad47-8adba3bbf857)
![Screenshot (32)](https://github.com/user-attachments/assets/b66bb092-b37a-470e-a096-63223c6cd1b5)
![Screenshot (31)](https://github.com/user-attachments/assets/9a25c371-36f3-4842-a0a7-a6512de282c0)

# 📄 License
This project is for portfolio and demonstration purposes only.
All rights reserved ©️ Awais Ali Qureshi 2025.

# ✅ Bonus Suggestion
If you want to make it even more polished, you can add:

Badges like .NET version, License, Build Passing on the top

A Demo Credentials section if you have a default admin login
