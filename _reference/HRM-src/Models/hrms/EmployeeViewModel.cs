using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class EmployeeViewModel
    {
        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>

        public string? Email { get; set; }

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>

        [DataType(DataType.Password)]
        [Display(Name = "Current password")]
        public string? OldPassword { get; set; }

        [StringLength(100, ErrorMessage = "The {0} must be at least {2} and at max {1} characters long.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        [Display(Name = "New password")]
        public string? NewPassword { get; set; }


        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        [DataType(DataType.Password)]
        [Display(Name = "Confirm new password")]
        [Compare("NewPassword", ErrorMessage = "The new password and confirmation password do not match.")]
        public string? ConfirmPassword { get; set; }

        public string? Id { get; set; }
        public int? empId { get; set; }
        public int? machineId { get; set; }
        public string name { get; set; }
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
        public IFormFile? profile_pic { get; set; }
        public string? profile { get; set; }
        public string? attend_type { get; set; }
            public int? companyId { get; set; }
            public int? departId { get; set; }
		public string? departname { get; set; }
		public int? designationId { get; set; }
		public string? designationname { get; set; }
		public int? shiftId { get; set; }
            public string? roleId { get; set; }
            public DepartmentModel? depart { get; set; }
		    public CompanyModel? company { get; set; }
		    public DesignationModel? designation { get; set; }
		    public ShiftModel? shift { get; set; }
		    public List<IFormFile>? filepath { get; set; }
            public List<EmpDocModel>? empDocs { get; set; }
    		public List<EmpFamilyDocModel>? empFamilyDocs { get; set; }
	    	public List<EmpFamilyModel>? empFamilies { get; set; }
	}
    }
