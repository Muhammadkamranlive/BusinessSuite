using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NuGet.Protocol.Core.Types;
using System.ComponentModel.Design;
using System.Globalization;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using System.Linq;
using System.Threading.Tasks;

namespace itgsgroup.Controllers
{
	[Authorize]
	public class PayRollController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _manager;

        public PayRollController( ApplicationDbContext context,UserManager<ApplicationUser> manager)
        {
            _context = context;
            _manager = manager;
        }
		[Authorize(Roles = "admin,HR,Viewer")]
		public async Task<IActionResult> Index(string? monthyear,int? company)
        {
            string result = "";
            if (monthyear != null)
            {
                DateTime date = DateTime.ParseExact(monthyear, "yyyy-MM", CultureInfo.InvariantCulture);
                string monthName = date.ToString("MMMM", CultureInfo.InvariantCulture);
                string year = date.ToString("yyyy", CultureInfo.InvariantCulture);
                result = monthName + year;
                result = result.ToUpper();
            }
            List<PayRollModel> payroll = await _context.payRolls
                .Include(c => c.employee)
                .Where(c => c.monthYear == result && c.employee.company.Id == company)
                .OrderBy(c => c.employee.departId).ThenBy(c => c.employee.joining_date)
                .ToListAsync();

            List<Tuple<string, int>> companys = _context.companies
          .Select(c => Tuple.Create(c.name, c.Id))
          .ToList();
            ViewBag.Companys = companys;
            ViewBag.companyid = company;
            ViewBag.monthyears = monthyear;
            return View(payroll);
        }
		[Authorize(Roles = "admin,HR")]
		[HttpPost]
        public IActionResult Index(List<PayRollModel> payrollList,string monthyear,int company)
        {
            foreach (var payroll in payrollList)
            {
                // Find the PayRollModel in the database by Id
                var existingPayroll = _context.payRolls.FirstOrDefault(c => c.Id == payroll.Id);

                if (existingPayroll != null)
                {
                    // Update the properties of the existing PayRollModel with values from the parameter
                    existingPayroll.loan_deduction = payroll.loan_deduction;
                    existingPayroll.sessi_deduction = payroll.sessi_deduction;
                    existingPayroll.other_deduction = payroll.other_deduction;
                    existingPayroll.taxable_arear = payroll.taxable_arear;
                    existingPayroll.arear = payroll.arear;
                    existingPayroll.bonus = payroll.bonus;
                    existingPayroll.remarks = payroll.remarks;
                    existingPayroll.CPR = payroll.CPR;

                    // Save the changes to the database
                    _context.SaveChanges();
                }
            }

            return RedirectToAction(nameof(Index), new RouteValueDictionary { { "monthyear", monthyear },{ "company", company} });
        }
		[Authorize(Roles = "admin,HR")]
		public IActionResult generatePayRoll(string monthyear,int company) {
            if (monthyear != null)
            {
                string date = monthyear + "-01";
                _context.payRolls.FromSqlRaw("EXEC payroll @month = '" + date + "', @companyId = '" + company + "'").ToList();
            }
            return RedirectToAction(nameof(Index), new RouteValueDictionary { { "monthyear", monthyear }, { "company", company } });

        }
		[Authorize(Roles = "admin,HR,Viewer")]
		public IActionResult PayRollfinal(string monthyear,int company)
        {
            string date2 = monthyear + "-01";
            string result = "";
            if (monthyear != null)
            {
                DateTime date = DateTime.ParseExact(monthyear, "yyyy-MM", CultureInfo.InvariantCulture);
                string monthName = date.ToString("MMMM", CultureInfo.InvariantCulture);
                string year = date.ToString("yyyy", CultureInfo.InvariantCulture);
                result = monthName + year;
                result = result.ToUpper();
            }
            var payroll = _context.payRolls.FromSqlRaw("EXEC payroll_final @date = '" + date2 + "', @monthyear = '" + result + "', @companyId = '" + company + "'").ToList();

            foreach (var item in payroll)
            {
                _context.Entry(item)
                    .Reference(c => c.employee) // Assuming emp is a reference (single navigation property)
                    .Load();
            }
            return View(payroll.Where(c => c.employee.companyId == company)
                                .OrderBy(c => c.employee.departId).ThenBy(c => c.employee.joining_date)
                .ToList());

        }

        public async Task<IActionResult> IncomeTaxCertificate()
        {
			var user = await _manager.GetUserAsync(User);

            List<PayRollModel> incometaxcertificate = _context.payRolls
                .Include(c => c.employee)
                .Include(c => c.employee.company)
                .Where(c => c.employeeId == user.Id)
                .AsEnumerable() // Switch to LINQ to Objects for in-memory operations
                .OrderBy(c => DateTime.ParseExact(
                    c.monthYear, "MMMMyyyy", CultureInfo.InvariantCulture
                ).ToString("dd-MM-yyyy"))
                .ToList();

            return View(incometaxcertificate);
        }
        public async Task<IActionResult> empPayRoll()
        {
            var user = await _manager.GetUserAsync(User);

            List<PayRollModel> empPayroll = _context.payRolls
                .Include(c => c.employee)
                .Include(c => c.employee.depart)
                .Where(c => c.employeeId == user.Id && c.net_salary != null)
                .AsEnumerable() // Switch to LINQ to Objects for in-memory operations
                .OrderBy(c => DateTime.ParseExact(
                    c.monthYear, "MMMMyyyy", CultureInfo.InvariantCulture
                ).ToString("dd-MM-yyyy"))
                .ToList();

            return View(empPayroll);
        }
        public async Task<IActionResult> bankletter(string monthyear,int company)
        {
            ViewBag.monthyear = monthyear;
            string result = "";
            if (monthyear != null)
            {
                DateTime date = DateTime.ParseExact(monthyear, "yyyy-MM", CultureInfo.InvariantCulture);
                string monthName = date.ToString("MMMM", CultureInfo.InvariantCulture);
                string year = date.ToString("yyyy", CultureInfo.InvariantCulture);
                result = monthName + year;
                result = result.ToUpper();
            }
            List<PayRollModel> bankletter = await _context.payRolls
                .Include(c => c.employee)
                .Include(c => c.employee.depart)
                .Where(c => c.monthYear == result && c.employee.company.Id == company)
                .OrderBy(c => c.employee.departId).ThenBy(c => c.employee.joining_date)
                .ToListAsync();

            List<Tuple<string, int>> companys = _context.companies
         .Select(c => Tuple.Create(c.name, c.Id))
         .ToList();
            ViewBag.Companys = companys;

            ViewBag.sumnetamt = bankletter.Sum(c => c.net_salary);
           // ViewBag.companyname = _context.companies.FirstOrDefault(c => c.Id == company).name;
            return View(bankletter);

        }
        public async Task<IActionResult> salaryslip(string monthyear)
        {
            string result = "";
            var user = await _manager.GetUserAsync(User);
            if (monthyear != null)
            {
				DateTime dateObj = DateTime.Parse(monthyear);
				string formattedDate = dateObj.ToString("MMMM, yyyy");
				ViewBag.monthyear = formattedDate;

				DateTime date = DateTime.ParseExact(monthyear, "yyyy-MM", CultureInfo.InvariantCulture);
                string monthName = date.ToString("MMMM", CultureInfo.InvariantCulture);
                string year = date.ToString("yyyy", CultureInfo.InvariantCulture);
                result = monthName + year;
                result = result.ToUpper();
            }
            List<PayRollModel> salaryslip = await _context.payRolls
                .Include(c => c.employee)
                .Include(c => c.employee.depart)
                .Include(c => c.employee.designation)
                .Include(c => c.employee.company)
                .Where(c => c.monthYear == result && c.employeeId == user.Id)
                .OrderBy(c => c.Id)
                .ToListAsync();
            ViewBag.company = user.companyId;
            return View(salaryslip);

        }
    }
}
