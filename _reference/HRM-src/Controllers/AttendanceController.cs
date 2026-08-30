using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Microsoft.AspNetCore.SignalR;
using System;
using itgsgroup.Hub;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using System.Data;

namespace itgsgroup.Controllers
{
    [Authorize]
    public class AttendanceController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IHubContext<DataHub> _hubContext;
		private readonly ITimeService _timeService;

		public AttendanceController(ApplicationDbContext context, UserManager<ApplicationUser> userManager
			, IHubContext<DataHub> hubContext, ITimeService timeService)
        {
            _context = context;
            _userManager = userManager;
            _hubContext = hubContext;
			_timeService = timeService;
		}
        public IActionResult Index()
        {
            var items = _context.rawattendances.ToList();
            return View(items);
        }

        public async Task<IActionResult> Reconciliation(string Fromdate,string Todate,string empId,int companyId,string role)
        {
			ViewBag.Fromdate = Fromdate;
            ViewBag.role = role;
            var employeeId = _userManager.GetUserId(User);
            var user = await _userManager.FindByIdAsync(employeeId);
            if (empId == "undefined") {
				empId = "";
				
			}

            var reconciliation = _context.ReconciliationViewModels.FromSqlRaw("EXEC Reconciliation @Fromdate = '"+ Fromdate+"',@Todate = '"+Todate+ "',@empId = '"+empId+"',@companyId = '"+companyId+"'").ToList();

            foreach (var item in reconciliation)
            {
                _context.Entry(item)
                    .Reference(c => c.emp) // Assuming emp is a reference (single navigation property)
                    .Load();
            } 
			
			var userRoles = await _userManager.GetRolesAsync(user);
			ViewBag.userRole = userRoles.FirstOrDefault();


            if ((userRoles.FirstOrDefault() == "HR" || userRoles.FirstOrDefault() == "admin" || userRoles.FirstOrDefault() == "Viewer") && role == "HR")
			{
                List<Tuple<string, int>> companys = _context.companies
				.Select(c => Tuple.Create(c.name, c.Id))
				.ToList();
                ViewBag.Companys = companys;

                /*	List<Tuple<string, string, int?>> emps = _userManager.Users
    .AsEnumerable() // Fetch users into memory
    .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
    && u.status == "Active")
    .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
    .OrderBy(c => c.Item1)
    .ToList();*/
                var hrAndAdminRoleIds = _context.Roles
                 .Where(r => r.Name == "HR" || r.Name == "Admin")
                 .Select(r => r.Id)
                 .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();

                ViewBag.emps = emps;
                return View(reconciliation.OrderBy(c => c.emp.companyId).ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ToList());
			}
            else if ((userRoles.FirstOrDefault() == "HOD" || userRoles.FirstOrDefault() == "admin") && role == "HOD")
            {
                return View(reconciliation.Where(c => c.emp.departId == user.departId && c.empId != user.Id 
				).OrderBy(c => c.emp.companyId).ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ToList());
            }
            else
			{
				return View(reconciliation.Where(c => c.empId == employeeId)
                    .OrderBy(c => c.emp.companyId).ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ToList());
			}

		}
		[Authorize(Roles = "admin,HR,Viewer")]
		public IActionResult DetailAtt(string Fromdate,string Todate,string empId,int companyId)
        {
			if (Fromdate != null && Todate != null)
			{
				ViewBag.Fromdate = Fromdate;
				var detail_att = _context.tempMonthAttViewModels.FromSqlRaw("EXEC tempMonthlyAttendance @Fromdate = '" + Fromdate + "',@Todate = '" + Todate + "',@empId = '" + empId + "',@companyId = '" + companyId + "'").ToList();
				foreach (var item in detail_att)
				{
					_context.Entry(item)
						.Reference(c => c.emp) // Assuming emp is a reference (single navigation property)
						.Load();
				}
				List<Tuple<string, int>> companys = _context.companies
					.Select(c => Tuple.Create(c.name, c.Id))
					.ToList();
				ViewBag.Companys = companys;

                /*	List<Tuple<string, string, int?>> emps = _userManager.Users
             .AsEnumerable() // Fetch users into memory
             .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
             && u.status == "Active")
             .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
             .OrderBy(c => c.Item1)
             .ToList();
                */
                var hrAndAdminRoleIds = _context.Roles
                 .Where(r => r.Name == "HR" || r.Name == "Admin")
                 .Select(r => r.Id)
                 .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();
                ViewBag.emps = emps;
				return View(detail_att.OrderBy(c => c.companyId).ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ThenBy(v => v.date).ToList());
			}
			else
			{
                //var detail_att = _context.tempMonthAttViewModels.ToList();
                List<Tuple<string, int>> companys = _context.companies
                    .Select(c => Tuple.Create(c.name, c.Id))
                    .ToList();
                ViewBag.Companys = companys;

                /*List<Tuple<string, string, int?>> emps = _userManager.Users
         .AsEnumerable() // Fetch users into memory
         .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
         && u.status == "Active")
         .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
         .OrderBy(c => c.Item1)
         .ToList();
				*/
                var hrAndAdminRoleIds = _context.Roles
             .Where(r => r.Name == "HR" || r.Name == "Admin")
             .Select(r => r.Id)
             .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();
                ViewBag.emps = emps;
                return View();
			}
        }
		public IActionResult DailyAttDetail() 
		{
			var tempAtt = _context.tempMonthAtts.Include(c => c.emp).Include(c => c.emp.depart)
				.Where(c => c.date.Date == _timeService.GetCurrentTimeInPakistan().Date)
				.OrderBy(c => c.emp.companyId).ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date)
				.ToList();

			return View(tempAtt);
		}

        public async Task<IActionResult> deductioncount(string Fromdate, string Todate, string empId, int companyId,string? role)
        {
			var employeeId = _userManager.GetUserId(User);
			var user = await _userManager.FindByIdAsync(employeeId);

			ViewBag.Fromdate = Fromdate;
            var deductioncount = _context.deductionCountViewModels.FromSqlRaw("EXEC DeductionCount @Fromdate = '"+ Fromdate+"',@Todate = '"+Todate+ "',@empId = '"+empId+"',@companyId = '"+companyId+"'").ToList();

            foreach (var item in deductioncount)
            {
                _context.Entry(item)
                    .Reference(c => c.emp) // Assuming emp is a reference (single navigation property)
                    .Load();
            }
			if (role == "Emp")
			{
				List<Tuple<string, int>> companys = _context.companies
					.Where(u => u.Id == user.companyId)
				.Select(c => Tuple.Create(c.name, c.Id))
				.ToList();
				ViewBag.Companys = companys;

                //List<Tuple<string, string, int?>> emps = _userManager.Users
                //.Select(c => Tuple.Create(c.name, c.Id, c.companyId))			 
                //.ToList();
                /*	List<Tuple<string, string, int?>> emps = _userManager.Users
            .AsEnumerable() // Fetch users into memory
            .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
            && u.status == "Active" && u.Id == user.Id)
            .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
            .OrderBy(c => c.Item1)
            .ToList();
                */
                var hrAndAdminRoleIds = _context.Roles
                 .Where(r => r.Name == "HR" || r.Name == "Admin")
                 .Select(r => r.Id)
                 .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();

                ViewBag.emps = emps;
			}
			else if (role == "HR")
			{
				List<Tuple<string, int>> companys = _context.companies
.Select(c => Tuple.Create(c.name, c.Id))
.ToList();
				ViewBag.Companys = companys;

                //List<Tuple<string, string, int?>> emps = _userManager.Users
                //.Select(c => Tuple.Create(c.name, c.Id, c.companyId))			 
                //.ToList();
                /*	List<Tuple<string, string, int?>> emps = _userManager.Users
            .AsEnumerable() // Fetch users into memory
            .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
            && u.status == "Active")
            .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
            .OrderBy(c => c.Item1)
            .ToList();
                */
                var hrAndAdminRoleIds = _context.Roles
                 .Where(r => r.Name == "HR" || r.Name == "Admin")
                 .Select(r => r.Id)
                 .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();

                ViewBag.emps = emps;
			}
			else if (role == "HOD")
			{
				List<Tuple<string, int>> companys = _context.companies
					.Where(u => u.Id == user.companyId)
.Select(c => Tuple.Create(c.name, c.Id))
.ToList();
				ViewBag.Companys = companys;

                //List<Tuple<string, string, int?>> emps = _userManager.Users
                //.Select(c => Tuple.Create(c.name, c.Id, c.companyId))			 
                //.ToList();
                /*	List<Tuple<string, string, int?>> emps = _userManager.Users
            .AsEnumerable() // Fetch users into memory
            .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
            && u.status == "Active" && u.departId == user.departId )
            .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
            .OrderBy(c => c.Item1)
            .ToList();
                */
                var hrAndAdminRoleIds = _context.Roles
                 .Where(r => r.Name == "HR" || r.Name == "Admin")
                 .Select(r => r.Id)
                 .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();

                ViewBag.emps = emps;
			}
			ViewBag.role = role;
			return View(deductioncount.OrderBy(c => c.emp.companyId).ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ToList());
        }
        public async Task<IActionResult> leavecount(string Fromdate, string Todate, string empId, int companyId,string role)
        {
            if (empId == "undefined")
            {
                empId = "";

            }
           
                ViewBag.Fromdate = Fromdate;
			ViewBag.role = role;
			var leavecount = _context.leaveCountViewModels.FromSqlRaw("EXEC types_leave_count @Fromdate = '" + Fromdate + "',@Todate = '" + Todate + "',@empId = '" + empId + "',@companyId = '" + companyId + "'").ToList();
			var employeeId = _userManager.GetUserId(User);
			var user = await _userManager.FindByIdAsync(employeeId);
			var userRoles = await _userManager.GetRolesAsync(user);
			ViewBag.userRole = userRoles.FirstOrDefault();


				foreach (var item in leavecount)
				{
					_context.Entry(item)
						.Reference(c => c.emp) // Assuming emp is a reference (single navigation property)
						.Load();
				}
				ViewBag.Heading1 = leavecount.FirstOrDefault(c => c.Id == 1).empId;
				ViewBag.Heading2 = leavecount.FirstOrDefault(c => c.Id == 1).col1;
				ViewBag.Heading3 = leavecount.FirstOrDefault(c => c.Id == 1).col2;
				ViewBag.Heading4 = leavecount.FirstOrDefault(c => c.Id == 1).col3;
				ViewBag.Heading5 = leavecount.FirstOrDefault(c => c.Id == 1).col4;
				ViewBag.Heading6 = leavecount.FirstOrDefault(c => c.Id == 1).col5;
				ViewBag.Heading7 = leavecount.FirstOrDefault(c => c.Id == 1).col6;
				ViewBag.Heading8 = leavecount.FirstOrDefault(c => c.Id == 1).col7;
				ViewBag.Heading9 = leavecount.FirstOrDefault(c => c.Id == 1).col8;
				ViewBag.Heading10 = leavecount.FirstOrDefault(c => c.Id == 1).col9;
				ViewBag.Heading11 = leavecount.FirstOrDefault(c => c.Id == 1).col10;
			if ((userRoles.FirstOrDefault() == "HR" || userRoles.FirstOrDefault() == "admin" || userRoles.FirstOrDefault() == "Viewer") && role == "HR")
			{
				List<Tuple<string, int>> companys = _context.companies
.Select(c => Tuple.Create(c.name, c.Id))
.ToList();
				ViewBag.Companys = companys;

                /*	List<Tuple<string, string, int?>> emps = _userManager.Users
             .AsEnumerable() // Fetch users into memory
             .Where(u => !(_userManager.IsInRoleAsync(u, "HR").Result || _userManager.IsInRoleAsync(u, "Admin").Result)
             && u.status == "Active")
             .Select(c => Tuple.Create(c.name, c.Id, c.companyId))
             .OrderBy(c => c.Item1)
             .ToList();
                */
                var hrAndAdminRoleIds = _context.Roles
                 .Where(r => r.Name == "HR" || r.Name == "Admin")
                 .Select(r => r.Id)
                 .ToList();

                // Fetch user IDs associated with those roles
                var hrAndAdminUserIds = _context.UserRoles
                    .Where(ur => hrAndAdminRoleIds.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToList();

                // Filter users who are NOT in "HR" or "Admin" and are "Active"
                var emps = _context.Users
                    .Where(u => !hrAndAdminUserIds.Contains(u.Id) && u.status == "Active")
                    .OrderBy(u => u.name)
                    .Select(u => Tuple.Create(u.name, u.Id, u.companyId))
                    .ToList();
                ViewBag.emps = emps;


				return View(leavecount.Where(c => c.Id != 1).OrderBy(c => c.emp.companyId)
					.ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ToList());

			}
			else if ((userRoles.FirstOrDefault() == "HOD" || userRoles.FirstOrDefault() == "admin") && role == "HOD")
			{
				return View(leavecount.Where(c => c.Id != 1 && c.emp.departId == user.departId && c.empId != user.Id
                ).OrderBy(c => c.emp.companyId)
                    .ThenBy(c => c.emp.departId).ThenBy(c => c.emp.joining_date).ToList());
			}
			else
			{
				return View();
			}
            
           
        }

		public IActionResult empAttend()
		{
			var empId = _userManager.GetUserId(User);

			var empRawAttquery = _context.rawattendances
			.Where(r => r.empId == empId)
			.Select(r => new { r.att_datetime, r.AttState })
			.OrderByDescending(r => r.att_datetime);

			List<Tuple<DateTime, string>> empRawAtt = empRawAttquery.ToList()
			.Select(c => Tuple.Create(c.att_datetime, c.AttState))
			.Take(6)
			.ToList();

			ViewBag.empRawAtt = empRawAtt;
			
			DateTime currentDateTime = _timeService.GetCurrentTimeInPakistan();
			var emp_Attend = _context.empAttendViewModels.FromSqlRaw("EXEC emp_attend @empId = '" + empId + "'").ToList();
			TimeSpan todayin = emp_Attend.Where(c => c.date == currentDateTime.Date).Select(c => c.Checkin).FirstOrDefault();
			TimeSpan todayout = emp_Attend.Where(c => c.date == currentDateTime.Date).Select(c => c.Checkout).FirstOrDefault();			
			int todayintValue = 0;
			TimeSpan todaytime = TimeSpan.Zero;
			if (todayin != TimeSpan.Zero && todayout != TimeSpan.Zero) 
			{
				ViewBag.todaycheckin = todayin;
				ViewBag.todaycheckout = todayout;
				todaytime = todayout - todayin;
				ViewBag.todaytime = todaytime.Hours + ":" + todaytime.Minutes;
				double todaypercentage = ((double)todaytime.Hours / 9) * 100;
				todayintValue = (int)todaypercentage;
			} 
			else if (todayin != TimeSpan.Zero && todayout == TimeSpan.Zero)
			{
				ViewBag.todaycheckin = todayin;
				todaytime = currentDateTime.TimeOfDay - todayin;
				ViewBag.todaytime = todaytime.Hours + ":" + todaytime.Minutes;
				double todaypercentage = ((double)todaytime.Hours / 9) * 100;
				todayintValue = (int)todaypercentage;
			}
			else
			{
				ViewBag.todaytime = TimeSpan.Zero.Hours + ":" + TimeSpan.Zero.Minutes;
			}
			if (todayintValue <= 0)
			{
				ViewBag.todayhour = 0;
			}
			else if (todayintValue >= 0 && todayintValue < 11)
			{
				ViewBag.todayhour = 10;
			}
			else if (todayintValue < 21)
			{
				ViewBag.todayhour = 20;
			}
			else if (todayintValue < 31)
			{
				ViewBag.todayhour = 30;
			}
			else if (todayintValue < 41)
			{
				ViewBag.todayhour = 40;
			}
			else if (todayintValue < 51)
			{
				ViewBag.todayhour = 50;
			}
			else if (todayintValue < 61)
			{
				ViewBag.todayhour = 62;
			}
			else if (todayintValue < 71)
			{
				ViewBag.todayhour = 70;
			}
			else if (todayintValue < 91)
			{
				ViewBag.todayhour = 88;
			}
			else if (todayintValue > 90)
			{
				ViewBag.todayhour = 100;
			}

			//week hours
			int daysUntilMonday = ((int)currentDateTime.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
			DateTime startOfWeek = currentDateTime.AddDays(-daysUntilMonday);
			DateTime endOfWeek = startOfWeek.AddDays(5);

			int weeklyHour = emp_Attend.Where(c => c.date >= startOfWeek.Date && c.date < endOfWeek.Date
			&& c.date != currentDateTime.Date).Sum(c => c.actualhour.Hours);
			
			ViewBag.TotalWeekTime = weeklyHour + todaytime.Hours;

			int weekintValue = 0;
			double weekpercentage = ((double)(weeklyHour + todaytime.Hours) / 45) * 100;
			weekintValue = (int)weekpercentage;

			if (weekintValue <= 0)
			{
				ViewBag.weekhour = 0;
			}
			else if (weekintValue >= 0 && weekintValue < 11)
			{
				ViewBag.weekhour = 10;
			}
			else if (weekintValue < 21)
			{
				ViewBag.weekhour = 20;
			}
			else if (weekintValue < 31)
			{
				ViewBag.weekhour = 30;
			}
			else if (weekintValue < 41)
			{
				ViewBag.weekhour = 40;
			}
			else if (weekintValue < 51)
			{
				ViewBag.weekhour = 50;
			}
			else if (weekintValue < 61)
			{
				ViewBag.weekhour = 62;
			}
			else if (weekintValue < 71)
			{
				ViewBag.weekhour = 70;
			}
			else if (weekintValue < 91)
			{
				ViewBag.weekhour = 88;
			}
			else if (weekintValue > 90)
			{
				ViewBag.weekhour = 100;
			}

			//monthly hours
			
			int monthlyHour = emp_Attend.Where(c => c.date.Month == currentDateTime.Month 
			&& c.date.Year == currentDateTime.Year
			&& c.date != currentDateTime.Date).Sum(c => c.actualhour.Hours);

			ViewBag.TotalMonthTime = monthlyHour + todaytime.Hours;

			int monthintValue = 0;
			double monthpercentage = ((double)(monthlyHour + todaytime.Hours) / 198) * 100;
			monthintValue = (int)monthpercentage;

			if (monthintValue <= 0)
			{
				ViewBag.monthhour = 0;
			}
			else if (monthintValue >= 0 && monthintValue < 11)
			{
				ViewBag.monthhour = 10;
			}
			else if (monthintValue < 21)
			{
				ViewBag.monthhour = 20;
			}
			else if (monthintValue < 31)
			{
				ViewBag.monthhour = 30;
			}
			else if (monthintValue < 41)
			{
				ViewBag.monthhour = 40;
			}
			else if (monthintValue < 51)
			{
				ViewBag.monthhour = 50;
			}
			else if (monthintValue < 61)
			{
				ViewBag.monthhour = 62;
			}
			else if (monthintValue < 71)
			{
				ViewBag.monthhour = 70;
			}
			else if (monthintValue < 91)
			{
				ViewBag.monthhour = 88;
			}
			else if (monthintValue > 90)
			{
				ViewBag.monthhour = 100;
			}

			ViewBag.RemainMonthTime = 198 - (monthlyHour + todaytime.Hours);
			int remainintValue = 0;
			double remainpercentage = ((double)(198 - (monthlyHour + todaytime.Hours)) / 198) * 100;
			remainintValue = (int)remainpercentage;

			if (remainintValue <= 0)
			{
				ViewBag.remainhour = 0;
			}
			else if (remainintValue >= 0 && remainintValue < 11)
			{
				ViewBag.remainhour = 10;
			}
			else if (remainintValue < 21)
			{
				ViewBag.remainhour = 20;
			}
			else if (remainintValue < 31)
			{
				ViewBag.remainhour = 30;
			}
			else if (remainintValue < 41)
			{
				ViewBag.remainhour = 40;
			}
			else if (remainintValue < 51)
			{
				ViewBag.remainhour = 50;
			}
			else if (remainintValue < 61)
			{
				ViewBag.remainhour = 62;
			}
			else if (remainintValue < 71)
			{
				ViewBag.remainhour = 70;
			}
			else if (remainintValue < 91)
			{
				ViewBag.remainhour = 88;
			}
			else if (remainintValue > 90)
			{
				ViewBag.remainhour = 100;
			}

			/*ViewBag.pkrtime = _timeService.GetCurrentTimeInPakistan().ToString("MM/dd/yyyy HH:mm:ss");
			
			var empRawAttquery = _context.rawattendances
	        .Where(r => r.empId == empId)
	        .Select(r => new { r.att_datetime, r.AttState })
			.OrderByDescending(r => r.att_datetime);

			List<Tuple<DateTime, string>> empRawAtt = empRawAttquery.ToList()
			.Select(c => Tuple.Create(c.att_datetime, c.AttState))
			.Take(6)
			.ToList();
			
            ViewBag.empRawAtt = empRawAtt;
			
            var todaycheckin = empRawAttquery.FirstOrDefault(c => c.att_datetime.Date == DateTime.Now.Date
            && c.att_datetime.Month == DateTime.Now.Month && c.att_datetime.Year == DateTime.Now.Year
            && c.AttState == "4");
			
            var todaycheckout = empRawAttquery.FirstOrDefault(c => c.att_datetime.Date == DateTime.Now.Date
			&& c.att_datetime.Month == DateTime.Now.Month && c.att_datetime.Year == DateTime.Now.Year
            && c.AttState == "5");

			int todayintValue = 0;
			
            if (todaycheckin != null && todaycheckout != null)
			{
				ViewBag.todaycheckin = todaycheckin.att_datetime.ToString("ddd, dd MMM yyyy hh:mm tt");
				ViewBag.todaycheckout = todaycheckout.att_datetime.ToString("ddd, dd MMM yyyy hh:mm tt");
				TimeSpan todayduration = todaycheckout.att_datetime - todaycheckin.att_datetime;
				ViewBag.todaytime = todayduration.Hours+":"+todayduration.Minutes;
				double todaypercentage = ((double)todayduration.Hours / 9) * 100;
				todayintValue = (int)todaypercentage;
			}
			else if(todaycheckin != null && todaycheckout == null)
			{
				ViewBag.todaycheckin = todaycheckin.att_datetime.ToString("ddd, dd MMM yyyy hh:mm tt");
				TimeSpan todayduration = _timeService.GetCurrentTimeInPakistan() - todaycheckin.att_datetime;
                ViewBag.todaytime = todayduration.Hours + ":" + todayduration.Minutes;
				double todaypercentage = ((double)todayduration.Hours / 9) * 100;
				todayintValue = (int)todaypercentage;				
			}
			else
            {
				ViewBag.todaytime = TimeSpan.Zero.Hours+":"+ TimeSpan.Zero.Minutes;
				todayintValue = 0;
			}
			
            if (todayintValue <= 0)
			{
				ViewBag.todayhour = 0;
			}
			else if (todayintValue >= 0 && todayintValue < 11)
			{
				ViewBag.todayhour = 10;
			}
			else if (todayintValue < 21)
			{
				ViewBag.todayhour = 20;
			}
			else if (todayintValue < 31)
			{
				ViewBag.todayhour = 30;
			}
			else if (todayintValue < 41)
			{
				ViewBag.todayhour = 40;
			}
			else if (todayintValue < 51)
			{
				ViewBag.todayhour = 50;
			}
			else if (todayintValue < 61)
			{
				ViewBag.todayhour = 62;
			}
			else if (todayintValue < 71)
			{
				ViewBag.todayhour = 70;
			}
			else if (todayintValue < 91)
			{
				ViewBag.todayhour = 88;
			}
			else if (todayintValue > 90)
			{
				ViewBag.todayhour = 100;
			}

			DateTime today = _timeService.GetCurrentTimeInPakistan();
			int daysUntilMonday = ((int)today.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
			DateTime startOfWeek = today.AddDays(-daysUntilMonday);
			DateTime endOfWeek = startOfWeek.AddDays(5); // Calculate the end of the current week

			var weekcheckin = empRawAttquery.Where(c =>
			c.att_datetime.Date >= startOfWeek.Date && c.att_datetime.Date < endOfWeek.Date && c.AttState == "4"
			&& c.att_datetime.Date != today.Date).ToList();

			var weekcheckout = empRawAttquery.Where(c =>
			c.att_datetime.Date >= startOfWeek.Date && c.att_datetime.Date < endOfWeek.Date && c.AttState == "5"
			&& c.att_datetime.Date != today.Date).ToList();

			TimeSpan totalweekTimein = TimeSpan.Zero;
			foreach (var time in weekcheckin)
			{
				totalweekTimein += time.att_datetime.TimeOfDay;
			}
			TimeSpan totalweekTimeout = TimeSpan.Zero;
			foreach (var time in weekcheckout)
			{
				totalweekTimeout += time.att_datetime.TimeOfDay;
			}
			TimeSpan totalweektime = totalweekTimeout - totalweekTimein;
			TimeSpan todayduration2 = TimeSpan.Zero;
			if (todaycheckin != null && todaycheckin.att_datetime != null)
			{
				 todayduration2 = today - todaycheckin.att_datetime;

			}
			
			
			ViewBag.TotalWeekTime = totalweektime.TotalHours + todayduration2.Hours; // totalweektime.Hours + ":" + totalweektime.Minutes;
			
            int weekintValue = 0;
			double weekpercentage = ((double)(totalweektime.TotalHours + todayduration2.Hours) / 45) * 100;
			weekintValue = (int)weekpercentage;
			
            if (weekintValue <= 0)
			{
				ViewBag.weekhour = 0;
			}
			else if (weekintValue >= 0 && weekintValue < 11)
			{
				ViewBag.weekhour = 10;
			}
			else if (weekintValue < 21)
			{
				ViewBag.weekhour = 20;
			}
			else if (weekintValue < 31)
			{
				ViewBag.weekhour = 30;
			}
			else if (weekintValue < 41)
			{
				ViewBag.weekhour = 40;
			}
			else if (weekintValue < 51)
			{
				ViewBag.weekhour = 50;
			}
			else if (weekintValue < 61)
			{
				ViewBag.weekhour = 62;
			}
			else if (weekintValue < 71)
			{
				ViewBag.weekhour = 70;
			}
			else if (weekintValue < 91)
			{
				ViewBag.weekhour = 88;
			}
			else if (weekintValue > 90)
			{
				ViewBag.weekhour = 100;
			}

			var monthcheckin = empRawAttquery.Where(c => c.att_datetime.Month == DateTime.Now.Month
            && c.att_datetime.Year == DateTime.Now.Year && c.att_datetime.Date != DateTime.Now.Date
			&& c.AttState == "4").ToList();

			var monthcheckout = empRawAttquery.Where(c => c.att_datetime.Month == DateTime.Now.Month
			&& c.att_datetime.Year == DateTime.Now.Year && c.att_datetime.Date != DateTime.Now.Date
			&& c.AttState == "5").ToList();

			TimeSpan totalmonthTimein = TimeSpan.Zero;
			foreach (var time in monthcheckin)
			{
				totalmonthTimein += time.att_datetime.TimeOfDay;
			}
			TimeSpan totalmonthTimeout = TimeSpan.Zero;
			foreach (var time in monthcheckout)
			{
				totalmonthTimeout += time.att_datetime.TimeOfDay;
			}
			TimeSpan totalmonthtime = totalmonthTimeout - totalmonthTimein;
			ViewBag.TotalMonthTime = totalmonthtime.TotalHours + todayduration2.Hours;

			int monthintValue = 0;
			double monthpercentage = ((double)(totalmonthtime.TotalHours + todayduration2.Hours) / 198) * 100;
			monthintValue = (int)monthpercentage;

			if (monthintValue <= 0)
			{
				ViewBag.monthhour = 0;
			}
			else if (monthintValue >= 0 && monthintValue < 11)
			{
				ViewBag.monthhour = 10;
			}
			else if (monthintValue < 21)
			{
				ViewBag.monthhour = 20;
			}
			else if (monthintValue < 31)
			{
				ViewBag.monthhour = 30;
			}
			else if (monthintValue < 41)
			{
				ViewBag.monthhour = 40;
			}
			else if (monthintValue < 51)
			{
				ViewBag.monthhour = 50;
			}
			else if (monthintValue < 61)
			{
				ViewBag.monthhour = 62;
			}
			else if (monthintValue < 71)
			{
				ViewBag.monthhour = 70;
			}
			else if (monthintValue < 91)
			{
				ViewBag.monthhour = 88;
			}
			else if (monthintValue > 90)
			{
				ViewBag.monthhour = 100;
			}

			ViewBag.RemainMonthTime = 198 - (totalmonthtime.TotalHours + todayduration2.Hours);
			int remainintValue = 0;
			double remainpercentage = ((double)(198-(totalmonthtime.TotalHours + todayduration2.Hours)) / 198) * 100;
			remainintValue = (int)remainpercentage;

			if (remainintValue <= 0)
			{
				ViewBag.remainhour = 0;
			}
			else if (remainintValue >= 0 && remainintValue < 11)
			{
				ViewBag.remainhour = 10;
			}
			else if (remainintValue < 21)
			{
				ViewBag.remainhour = 20;
			}
			else if (remainintValue < 31)
			{
				ViewBag.remainhour = 30;
			}
			else if (remainintValue < 41)
			{
				ViewBag.remainhour = 40;
			}
			else if (remainintValue < 51)
			{
				ViewBag.remainhour = 50;
			}
			else if (remainintValue < 61)
			{
				ViewBag.remainhour = 62;
			}
			else if (remainintValue < 71)
			{
				ViewBag.remainhour = 70;
			}
			else if (remainintValue < 91)
			{
				ViewBag.remainhour = 88;
			}
			else if (remainintValue > 90)
			{
				ViewBag.remainhour = 100;
			}
			*/

			return View(emp_Attend);
		}
		[Authorize(Roles = "admin,HOD")]

		public IActionResult subAttend()
        {
            var empId = _userManager.GetUserId(User);
            var sub_Attend = _context.empAttendViewModels.FromSqlRaw("EXEC sub_attend @empId = '" + empId + "'").ToList();

			foreach (var item in sub_Attend)
			{
				_context.Entry(item)
					.Reference(c => c.emp) // Assuming emp is a reference (single navigation property)
					.Load();
			}
			return View(sub_Attend.ToList());
		}


    }
}
