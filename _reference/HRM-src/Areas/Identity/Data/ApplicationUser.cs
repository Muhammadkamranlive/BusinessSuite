using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Identity;

namespace itgsgroup.Areas.Identity.Data;

// Add profile data for application users by adding properties to the ApplicationUser class
public class ApplicationUser : IdentityUser
{
    public int? empid { get; set; }
    public int? machineId { get; set; }
    public string? name { get; set; }
    public string? bank { get; set; }
    public string? account { get; set; }
    public string? f_name { get; set; }
    public string? cnic { get; set; }
    public DateTime? cnic_issue { get; set; }
    public DateTime? cnic_expiry { get; set; }
    public string? passport { get; set; }
    public string? curr_address { get; set; }
    public string? permanent_address { get; set; }
    public string? marital_status { get; set; }
    public string? status { get; set; }
    public string? contact { get; set; }
    public string? emergency_contact { get; set; }
    public DateTime? joining_date { get; set; }
    public DateTime? resignation_date { get; set; }
    public string? emp_type { get; set; }
    public int? salary { get; set; }
    public string? profile_pic { get; set; }
    public string? attend_type { get; set; }
    public int? companyId { get; set; }
    public CompanyModel? company { get; set; }
    public int? departId { get; set; }
    public DepartmentModel? depart { get; set; }
    public int? designationId { get; set; }
    public DesignationModel? designation { get; set; }
    public int? shiftId { get; set; }
    public ShiftModel? shift { get; set; }
    public List<EmpDocModel>? empDocs { get; set; }

}

