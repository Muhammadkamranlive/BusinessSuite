using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Reflection.Metadata.Ecma335;

namespace itgsgroup.Controllers
{
	[Authorize]
	public class EmployeeController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;
        private readonly RoleManager<IdentityRole> _manager;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public EmployeeController(UserManager<ApplicationUser> userManager,ApplicationDbContext context,
            RoleManager<IdentityRole> manager, IWebHostEnvironment webHostEnvironment,
            SignInManager<ApplicationUser> signInManager)
        {
            _userManager = userManager;
            _context = context;
            _manager = manager;
            _webHostEnvironment = webHostEnvironment;
            _signInManager = signInManager;
        }
		[Authorize(Roles = "admin,HR,Viewer")]
		public async Task<IActionResult> Index(string? status)
        {
            ViewBag.status = status;
            if (status == "All" || status is null)
            {
                List<ApplicationUser> users = _userManager.Users.Include(c => c.company).
                    Include(c => c.designation)
                    .Include(c => c.depart)
                    .Include(c => c.shift)
                    .OrderBy(c => c.companyId).ThenBy(c => c.departId).ThenBy(c => c.joining_date).ToList();

                return View(users);
            }
            else if (status == "Active")
            {
                List<ApplicationUser> users = _userManager.Users.Include(c => c.company)
                    .Include(c => c.depart)
                    .Include(c => c.shift)
                    .Include(c => c.designation).Where(c => c.status == "Active")
                    .OrderBy(c => c.companyId).ThenBy(c => c.departId).ThenBy(c => c.joining_date).ToList();

                return View(users);
            }
            else if (status == "Resign")
            {
                List<ApplicationUser> users = _userManager.Users.Include(c => c.company)
                    .Include(c => c.depart)
                    .Include(c => c.shift)
                    .Include(c => c.designation).Where(c => c.status == "Inactive")
                    .OrderBy(c => c.companyId).ThenBy(c => c.departId).ThenBy(c => c.joining_date).ToList();

                return View(users);
            }
            else
            {
                return View();
            }
        }
        public IActionResult all_users()
        {
            return RedirectToAction(nameof(Index), new { status = "All" });
        }
        public IActionResult active_users()
        {
            return RedirectToAction(nameof(Index), new { status = "Active" });
        }
        public IActionResult resign_users()
        {
            return RedirectToAction(nameof(Index), new { status = "Resign" });
        }


        [Authorize(Roles = "admin,HR")]
		public async Task<IActionResult> Edit(string id)
        {

            ViewData["id"] = id;
            ViewBag.Companys = _context.companies.ToList();
            ViewBag.roles = _manager.Roles.ToList();
            ViewBag.departments = _context.departments.ToList();
            ViewBag.designations = _context.designations.ToList();
            ViewBag.shifts = _context.shift.ToList();
           
            var emp = _userManager.Users.Include(c => c.empDocs).Where(c => c.Id == id).FirstOrDefault();
            var currentRoles = await _userManager.GetRolesAsync(emp);
            var role = await _manager.FindByNameAsync(currentRoles.FirstOrDefault());
            if (id != null)
            {
                var empedit = new EmployeeViewModel
                {
                    Email = emp.Email,
                    Id = emp.Id,
                    empId = emp.empid,
                    name = emp.name,
                    bank = emp.bank,
                    account = emp.account,
                    f_name = emp.f_name,
                    cnic = emp.cnic,
                    cnic_issue = emp.cnic_issue,
                    cnic_expiry = emp.cnic_expiry,
                    passport = emp.passport,
                    curr_address = emp.curr_address,
                    permanent_address = emp.permanent_address,
                    marital_status = emp.marital_status,
                    status = emp.status,
                    contact = emp.contact,
                    emergency_contact = emp.emergency_contact,
                    joining_date = emp.joining_date,
                    resignation_date = emp.resignation_date,
                    emp_type = emp.emp_type,
                    salary = emp.salary,
                    companyId = emp.companyId,
                    departId = emp.departId,
                    designationId = emp.designationId,
                    shiftId = emp.shiftId,
                    profile = emp.profile_pic,
                    attend_type = emp.attend_type,
                    roleId = role.Id,
                    empDocs = emp.empDocs.ToList(),
                    machineId = emp.machineId,
            };
                // Store abc in ViewData
                return View(empedit);
            }

            return View();
        }
		
        [Authorize(Roles = "admin,HR")]
		[HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, EmployeeViewModel EmpModel)
        {
            if (id != EmpModel.Id)
            {
                return NotFound();
            }
            // Step 1: Retrieve the user by their unique identifier (userId).
            var user = await _userManager.FindByIdAsync(id);

            if (user == null)
            {
                // Handle the case where the user doesn't exist.
                return NotFound();
            }

            // Step 2: Make changes to the user.
            user.name = EmpModel.name;
            user.Email = EmpModel.Email;
            user.UserName = EmpModel.Email;
            user.bank = EmpModel.bank;
            user.account = EmpModel.account;
            user.f_name = EmpModel.f_name;
            user.cnic = EmpModel.cnic;
            user.cnic_issue = EmpModel.cnic_issue;
            user.cnic_expiry = EmpModel.cnic_expiry;
            user.passport = EmpModel.passport;
            user.curr_address = EmpModel.curr_address;
            user.permanent_address = EmpModel.permanent_address;
            user.marital_status = EmpModel.marital_status;
            user.status = EmpModel.status;
            user.contact = EmpModel.contact;
            user.emergency_contact = EmpModel.emergency_contact;
            user.joining_date = EmpModel.joining_date;
            user.resignation_date = EmpModel.resignation_date;
            user.emp_type = EmpModel.emp_type;
            user.salary = EmpModel.salary;
            user.attend_type = EmpModel.attend_type;
            user.companyId = EmpModel.companyId;
            user.departId = EmpModel.departId;
            user.designationId = EmpModel.designationId;
            user.shiftId = EmpModel.shiftId;
            user.machineId = EmpModel.machineId;
           

            // Step 2: Remove the user from their current roles.
            var currentRoles = await _userManager.GetRolesAsync(user);
            await _userManager.RemoveFromRolesAsync(user, currentRoles);

            // Step 3: Add the user to the new role.
            var role = await _manager.FindByIdAsync(EmpModel.roleId);
            await _userManager.AddToRoleAsync(user, role.Name);

         //   await _userManager.ChangePasswordAsync(user, currentPassword, EmpModel.Password);


            if (EmpModel.profile_pic != null)
            {
                string uniqueFileName = null;
                string uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "dist/files");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }
                uniqueFileName = Guid.NewGuid().ToString() + "_" + EmpModel.profile_pic.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);
                EmpModel.profile_pic.CopyTo(new FileStream(filePath, FileMode.Create));
                user.profile_pic = uniqueFileName;
            }
            

            // Update other properties as needed.

            // Step 3: Save the changes to the database.
            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
            {
                if (EmpModel.filepath != null && EmpModel.filepath.Count > 0)
                {
                    string uniqueFileName2 = null;
                    foreach (IFormFile file in EmpModel.filepath)
                    {
                        string uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "dist/files");
                        if (!Directory.Exists(uploadsFolder))
                        {
                            Directory.CreateDirectory(uploadsFolder);
                        }
                        uniqueFileName2 = Guid.NewGuid().ToString() + "_" + file.FileName;
                        string filePath = Path.Combine(uploadsFolder, uniqueFileName2);
                        file.CopyTo(new FileStream(filePath, FileMode.Create));
                        var empDoc = new EmpDocModel
                        {
                            filepath = uniqueFileName2,
                            empId = user.Id,
                            companyId = (int)user.companyId
                        };
                        _context.Add(empDoc);
                    }
                await _context.SaveChangesAsync();
            }
                if (EmpModel.OldPassword != null && EmpModel.NewPassword != null)
                {
                    var changePasswordResult = await _userManager.ChangePasswordAsync(user, EmpModel.OldPassword, EmpModel.NewPassword);
                    if (!changePasswordResult.Succeeded)
                    {
                        foreach (var error in changePasswordResult.Errors)
                        {
                            ModelState.AddModelError(string.Empty, error.Description);
                        }
                        ViewBag.Companys = _context.companies.ToList();
                        ViewBag.roles = _manager.Roles.ToList();
                        ViewBag.departments = _context.departments.ToList();
                        ViewBag.designations = _context.designations.ToList();
                        ViewBag.shifts = _context.shift.ToList();
                        var emp = _userManager.Users.Include(c => c.empDocs).Where(c => c.Id == id).FirstOrDefault();
                        EmpModel.empDocs = emp.empDocs;
                        // return RedirectToAction(nameof(Edit), new { id = id}); // Return to the edit view with error messages.
                        return View(EmpModel);
                    }

                    await _signInManager.RefreshSignInAsync(user);
                }
                // The user was successfully updated.
                return RedirectToAction("all_users", "Employee"); // Redirect to a profile page or another appropriate action.
            }
            else
            {
                // Handle errors if the update fails.
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
                var modelStateErrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();

                // Store the list in TempData
                ViewBag.Companys = _context.companies.ToList();
                ViewBag.roles = _manager.Roles.ToList();
                ViewBag.departments = _context.departments.ToList();
                ViewBag.designations = _context.designations.ToList();
                ViewBag.shifts = _context.shift.ToList();
                var emp = _userManager.Users.Include(c => c.empDocs).Where(c => c.Id == id).FirstOrDefault();
                EmpModel.empDocs = emp.empDocs;
                // return RedirectToAction(nameof(Edit), new { id = id}); // Return to the edit view with error messages.
                return View(EmpModel);
            }
        }
		
        [Authorize(Roles = "admin,HR")]
		[HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id,string empid)
        {
            try
            {
                var empDocModel = await _context.empDocs.FindAsync(id);
                if (empDocModel != null)
                {
                    _context.empDocs.Remove(empDocModel);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Edit), new { id = empid });
                }
                else
                {
                    // Handle the case where the record with the given ID doesn't exist
                    return NotFound();
                }
            }
            catch (DbUpdateException ex)
            {
               
                    // Handle other database update exceptions or rethrow the exception for further handling
                    throw;
             
            }

        }
        // Action to download a document
        public async Task<IActionResult> Download(string filename)
        {

            if (filename == null)
                return Content("filename is not availble");

            var path = Path.Combine(_webHostEnvironment.WebRootPath, "dist/files/", filename);

            var memory = new MemoryStream();
            using (var stream = new FileStream(path, FileMode.Open))
            {
                await stream.CopyToAsync(memory);
            }
            memory.Position = 0;
            return File(memory, GetContentType(path), Path.GetFileName(path));

        }
        private string GetContentType(string path)
        {
            var types = GetMimeTypes();
            var ext = Path.GetExtension(path).ToLowerInvariant();
            return types[ext];
        }

        // Get mime types
        private Dictionary<string, string> GetMimeTypes()
        {
            return new Dictionary<string, string>
    {
        {".txt", "text/plain"},
        {".pdf", "application/pdf"},
        {".doc", "application/vnd.ms-word"},
        {".docx", "application/vnd.ms-word"},
        {".xls", "application/vnd.ms-excel"},
		{".pptx", "application/vnd.ms-powerpoint"},
		{".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        {".png", "image/png"},
        {".jpg", "image/jpeg"},
        {".jpeg", "image/jpeg"},
        {".gif", "image/gif"},
        {".csv", "text/csv"}
    };
        }

        public async Task<IActionResult> Profile(string id) {
			var emp = _userManager.Users
	        .Include(u => u.company)
            .Include(u => u.depart)
            .Include(u => u.designation)
	        .Include(u => u.shift)
	        .Include(c => c.empDocs)
	        .FirstOrDefault(u => u.Id == id);
			var currentRoles = await _userManager.GetRolesAsync(emp);
			var role = await _manager.FindByNameAsync(currentRoles.FirstOrDefault());
            var empfamily = await _context.empFamily.Where(c => c.empId == id).ToListAsync();
			var empfamilyDocs = await _context.empFamilyDocs.Where(c => c.empId == id).ToListAsync();
			if (id != null)
			{
				var empedit = new EmployeeViewModel
				{
					Email = emp.Email,
					Id = emp.Id,
					empId = emp.empid,
					name = emp.name,
					bank = emp.bank,
					account = emp.account,
					f_name = emp.f_name,
					cnic = emp.cnic,
					cnic_issue = emp.cnic_issue,
					cnic_expiry = emp.cnic_expiry,
					passport = emp.passport,
					curr_address = emp.curr_address,
					permanent_address = emp.permanent_address,
					marital_status = emp.marital_status,
					status = emp.status,
					contact = emp.contact,
					emergency_contact = emp.emergency_contact,
					joining_date = emp.joining_date,
					resignation_date = emp.resignation_date,
					emp_type = emp.emp_type,
					salary = emp.salary,
					companyId = emp.companyId,
					departId = emp.departId,
                    departname = emp.depart.name,
					designationId = emp.designationId,
                    designationname = emp.designation.name,
					shiftId = emp.shiftId,
					profile = emp.profile_pic,
					attend_type = emp.attend_type,
					roleId = role.Id,
					empDocs = emp.empDocs.ToList(),
					machineId = emp.machineId,
                    empFamilies = empfamily,
                    empFamilyDocs = empfamilyDocs
				};
				// Store abc in ViewData
				return View(empedit);
			}

			return View();
		}

    }
}
