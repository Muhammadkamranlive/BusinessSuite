using itgsgroup.Areas.Identity.Data;
using Microsoft.Build.Execution;
using NuGet.Packaging.Signing;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class tempMonthAttModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; }
        public string day { get; set; }
        public DateTime? R_Checkin { get; set; }
        public DateTime Checkin { get; set; }
        public DateTime Checkout { get; set; }
        public TimeSpan actualhour { get; set; }
        public bool late { get; set; }
        public bool absent { get; set; }
        public bool diciplinaryaction { get; set; }
        public string? leave { get; set; }
        public bool halfday { get; set; }
        public bool earlygoing { get; set; }
        public bool present { get; set; }
        public string? holiday { get; set; }
        public string empId { get; set; }
        public ApplicationUser emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel company { get; set; }


    }
    public class tempMonthAttViewModel
    {
        public int Id { get; set; }
        public DateTime date { get; set; }
        public string day { get; set; }
        public DateTime? R_Checkin { get; set; }
        public DateTime Checkin { get; set; }
        public DateTime Checkout { get; set; }
        public TimeSpan actualhour { get; set; }
        public bool late { get; set; }
        public bool absent { get; set; }
        public bool diciplinaryaction { get; set; }
        public string? leave { get; set; }
        public bool halfday { get; set; }
        public bool earlygoing { get; set; }
        public bool present { get; set; }
        public string? holiday { get; set; }
        public string empId { get; set; }
        public ApplicationUser emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel company { get; set; }

    }
    public class empAttendViewModel
	{
		public Int64 Id { get; set; }
		public DateTime date { get; set; }
        public TimeSpan? time_correction { get; set; }
        public string Day { get; set; }
        public TimeSpan Checkin { get; set; }
		public TimeSpan Checkout { get; set; }
		public TimeSpan actualhour { get; set; }
		public string empId { get; set; }
		public ApplicationUser emp { get; set; }
	}
}
