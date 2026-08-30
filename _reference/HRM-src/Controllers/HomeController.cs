using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using Microsoft.EntityFrameworkCore;

namespace itgsgroup.Controllers
{
	public class HomeController : Controller
    {
               
        private readonly ILogger<HomeController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
		private readonly ITimeService _timeService;
		private readonly ApplicationDbContext _context;

		public HomeController(ApplicationDbContext context, ILogger<HomeController> logger,
                     UserManager<ApplicationUser> userManager, ITimeService timeService)
        {
			_context = context;
            _logger = logger;
			_userManager = userManager;
			_timeService = timeService;
		}

		public IActionResult test()
		{
			var abc = _context.leaveApplies.ToList();
			return View(abc);
		}
	public IActionResult GetCurrentTimeInPST()
		{
			var currentTimeInPST = _timeService.GetCurrentTimeInPakistan();

			// Format the time as needed
			ViewBag.CurrentTimeInPST = currentTimeInPST.ToString("dd/MM/yyyy HH:mm:ss");

			return View();
		}
		[Authorize]
        public async Task<IActionResult> AfterLogin()
        {
            var user = await _userManager.GetUserAsync(User);
			if (await _userManager.IsInRoleAsync(user, "admin"))
			{
				return RedirectToAction("Index", "Home");
			}
			else if (await _userManager.IsInRoleAsync(user, "HR"))
			{
				return RedirectToAction("Index", "Home");
			}
            else if (await _userManager.IsInRoleAsync(user, "Employee"))
			{
				return RedirectToAction("EmpIndex", "Home");
			}
			else if (await _userManager.IsInRoleAsync(user, "HOD"))
			{
				return RedirectToAction("EmpIndex", "Home");
			}
			return RedirectToAction("Index","Home");
		}

		[Authorize(Roles = "admin,HR,Viewer")]
		public IActionResult Index()
        {
			var noofcompanys = _context.companies.Count();
			var employees = _userManager.Users
				.Where(c => c.status == "Active" && c.resignation_date == null)
				.Count();
			var companys = _context.companies
	.Select(c => new
	{
		c.name,
		UserCount = c.AspNetUsers.Where(c => c.status == "Active" && c.resignation_date == null).Count()
	})
	.ToList();

			var coloredRows = _context.companies
				.Select(c => new
				{
					name = c.name,
					UserCount = c.AspNetUsers.Where(c => c.status == "Active" && c.resignation_date == null).Count()
				})
				.AsEnumerable() // Switch to in-memory processing for ROW_NUMBER() function
				.Select((c, index) => new
				{
					Color = GetColorByIndex(index),
					c.name,
					c.UserCount,
					Percent = (int)((double)c.UserCount / employees * 100)
				})
				.ToList();
			ViewBag.noofcompanys = noofcompanys;
			ViewBag.employees = employees;
			ViewBag.companys = coloredRows;

			return View(); 
        }

		private string GetColorByIndex(int index)
		{
			switch (index % 5)
			{
				case 0:
					return "purple";
				case 1:
					return "warning";
				case 2:
					return "success";
				case 3:
					return "danger";
				case 4:
					return "info";
				default:
					return "black"; // Default color or handle differently as needed
			}
		}

		[Authorize(Roles = "admin,Employee,HOD")]

		public IActionResult EmpIndex()
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
			return View();
		}

		[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

    }
}