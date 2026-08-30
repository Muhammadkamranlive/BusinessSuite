using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;

namespace itgsgroup.Controllers
{
	[Authorize]
	public class LeaveApplyController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        public IWebHostEnvironment _webHostEnvironment;


        public LeaveApplyController(ApplicationDbContext context, IWebHostEnvironment webHostEnvironment
            , UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
            _userManager = userManager;
        }

        // GET: LeaveApply
        public async Task<IActionResult> Index(int? id,string? exceddays,string? status)
        {
            var user = await _userManager.GetUserAsync(User);
            var userRoles = await _userManager.GetRolesAsync(user);
            ViewBag.userRole = userRoles.FirstOrDefault();
            ViewData["exceddays"] = exceddays;
            ViewData["companyId"] = user.companyId;
            ViewData["empId"] = user.Id;
            ViewData["id"] = id;
            ViewData["leaveId"] = new SelectList(_context.leaveTypes
                .Where(c => c.companyId == user.companyId && (c.fy.from < DateTime.Now && c.fy.to > DateTime.Now))
                , "Id", "type");

            ViewBag.AL = _context.leaveApplies.Where(c => c.leaveId == 
            (_context.leaveTypes.FirstOrDefault(c => c.fy.from < DateTime.Now && c.fy.to > DateTime.Now
            && c.type == "Annual Leave" && c.companyId == user.companyId).Id)
             && c.empId == user.Id && c.status == "Approve" && c.hrstatus == "Approve"
             && (c.leave.fy.from.Date <= c.from.Date && c.leave.fy.to.Date >= c.to.Date)).Sum(c => c.days);

            ViewBag.SL = _context.leaveApplies.Where(c => c.leaveId ==
            (_context.leaveTypes.FirstOrDefault(c => c.fy.from < DateTime.Now && c.fy.to > DateTime.Now
            && c.type == "Sick Leave" && c.companyId == user.companyId).Id)
             && c.empId == user.Id && c.status == "Approve" && c.hrstatus == "Approve"
             && (c.leave.fy.from.Date <= c.from.Date && c.leave.fy.to.Date >= c.to.Date)).Sum(c => c.days);

            ViewBag.CL = _context.leaveApplies.Where(c => c.leaveId ==
            (_context.leaveTypes.FirstOrDefault(c => c.fy.from < DateTime.Now && c.fy.to > DateTime.Now
            && c.type == "Casual Leave" && c.companyId == user.companyId).Id)
             && c.empId == user.Id && c.status == "Approve" && c.hrstatus == "Approve"
             && (c.leave.fy.from.Date <= c.from.Date && c.leave.fy.to.Date >= c.to.Date)).Sum(c => c.days);

            ViewBag.PL = _context.leaveApplies.Where(c => c.leaveId ==
            (_context.leaveTypes.FirstOrDefault(c => c.fy.from < DateTime.Now && c.fy.to > DateTime.Now
            && c.type == "Maternity Leave / Paternity Leave" && c.companyId == user.companyId).Id)
             && c.empId == user.Id && c.status == "Approve" && c.hrstatus == "Approve"
             && (c.leave.fy.from.Date <= c.from.Date && c.leave.fy.to.Date >= c.to.Date)).Sum(c => c.days);

            ViewBag.RL = (_context.leaveTypes.Where(c => c.fy.from < DateTime.Now && c.fy.to > DateTime.Now
             && new[] { "Annual Leave", "Sick Leave", "Casual Leave" }.Contains(c.type) && c.companyId == user.companyId).Sum(c => c.days))
            -
            (_context.leaveApplies.Where(c => new[] { "Annual Leave", "Sick Leave", "Casual Leave" }.Contains(c.leave.type) && (c.leave.fy.from < DateTime.Now
            && c.leave.fy.to > DateTime.Now)
            && (c.leave.fy.from.Date <= c.from.Date && c.leave.fy.to.Date >= c.to.Date)
            && c.empId == user.Id && c.status == "Approve" 
            && c.hrstatus == "Approve").Sum(c => c.days));

			var leaveapplies = await _context.leaveApplies.Include(l => l.company)
					.Include(l => l.emp).Include(l => l.leave).Where(c => c.empId == user.Id && c.hrstatus == status)
					.OrderByDescending(c => c.from).ToListAsync();

			if (status == "Pending") {
				leaveapplies = await _context.leaveApplies.Include(l => l.company)
	 .Include(l => l.emp).Include(l => l.leave)
	 .Where(c => c.empId == user.Id && c.hrstatus == "pending" && (c.status == "Approve" || c.status == "Pending"))
	 .OrderByDescending(c => c.from).ToListAsync();
			};
			if (status == "Approve")
			{
				leaveapplies = await _context.leaveApplies.Include(l => l.company)
	 .Include(l => l.emp).Include(l => l.leave)
	 .Where(c => c.empId == user.Id && c.hrstatus == "Approve" && c.status == "Approve")
	 .OrderByDescending(c => c.from).ToListAsync();
			};
			if (status == "Reject")
			{
				leaveapplies = await _context.leaveApplies.Include(l => l.company)
	 .Include(l => l.emp).Include(l => l.leave)
	 .Where(c => c.empId == user.Id &&( c.status == "Reject" || c.hrstatus == "Reject"))
	 .OrderByDescending(c => c.from).ToListAsync();
			};
			var leaveapply = await _context.leaveApplies.FindAsync(id);
            var leaveapplyview = new LeaveApplyViewModel
            {
                leaveApply = leaveapplies,
                from = null,
                to = null
            };
            if (id != null)
            {
               leaveapplyview = new LeaveApplyViewModel
                {
                    leaveApply = leaveapplies,
                    from = leaveapply.from,
                    to = leaveapply.to,
                    leaveId = leaveapply.leaveId,
                    reason = leaveapply.reason,
                    empId = leaveapply.empId,
                    companyId = leaveapply.companyId,
                    days = leaveapply.days
               };
            }
            ViewBag.status = status;

            return View(leaveapplyview);
        }

        public IActionResult pendingreq()
        {
            return RedirectToAction(nameof(Index), new { status = "Pending" });
        }
        public IActionResult approvereq()
        {
            return RedirectToAction(nameof(Index), new { status = "Approve" });
        }
        public IActionResult rejectreq()
        {
            return RedirectToAction(nameof(Index), new { status = "Reject" });
        }
        // GET: LeaveApply/Details/5

        // GET: LeaveApply/Create

        // POST: LeaveApply/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Id,from,days,status,hrstatus,to,leaveId,reason,empId,companyId")] LeaveApplyModel leaveApplyModel)
        {
            var user = await _userManager.GetUserAsync(User);
            int leavesdays = _context.leaveTypes
                .FirstOrDefault(c => c.Id == leaveApplyModel.leaveId && (c.fy.from.Date <= DateTime.Now.Date
                && c.fy.to.Date >= DateTime.Now.Date))?.days ?? 0;
            var leavestype = _context.leaveTypes
                .FirstOrDefault(c => c.Id == leaveApplyModel.leaveId && (c.fy.from.Date <= DateTime.Now.Date
                && c.fy.to.Date >= DateTime.Now.Date))?.type;
            int sumOfDays = _context.leaveApplies
               .Where(c => c.empId == user.Id && c.leaveId == leaveApplyModel.leaveId && c.status == "Approve"
               && c.hrstatus == "Approve" && (c.leave.fy.from.Date <= c.from.Date
                && c.leave.fy.to.Date >= c.to.Date))
               .Sum(c => c.days);

            if (ModelState.IsValid && leavesdays >= sumOfDays + leaveApplyModel.days)
            {
                _context.Add(leaveApplyModel);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            var exceddays = "";
            if (leavesdays < sumOfDays + leaveApplyModel.days) {
                 exceddays = "remaining "+leavestype + " "+ (leavesdays - sumOfDays).ToString();
            }
       
            return RedirectToAction(nameof(Index), new { exceddays = exceddays });
            //           return View(leaveApplyModel);
        }


        // POST: LeaveApply/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,from,to,days,status,leaveId,reason,empId,companyId")] LeaveApplyModel leaveApplyModel)
        {
            if (id != leaveApplyModel.Id)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(leaveApplyModel);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!LeaveApplyModelExists(leaveApplyModel.Id))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(Index));
            }
            ViewData["companyId"] = new SelectList(_context.companies, "Id", "Id", leaveApplyModel.companyId);
            ViewData["empId"] = new SelectList(_context.Users, "Id", "Id", leaveApplyModel.empId);
            ViewData["leaveId"] = new SelectList(_context.leaveTypes, "Id", "Id", leaveApplyModel.leaveId);
            return View(leaveApplyModel);
        }

        

        // POST: LeaveApply/Delete/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            if (_context.leaveApplies == null)
            {
                return Problem("Entity set 'ApplicationDbContext.leaveApplies'  is null.");
            }
            var leaveApplyModel = await _context.leaveApplies.FindAsync(id);
            if (leaveApplyModel != null)
            {
                _context.leaveApplies.Remove(leaveApplyModel);
            }
            
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool LeaveApplyModelExists(int id)
        {
          return (_context.leaveApplies?.Any(e => e.Id == id)).GetValueOrDefault();
        }
    }
}
