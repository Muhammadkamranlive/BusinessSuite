using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace itgsgroup.Models.hrms
{
    public class LeaveTypeModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string type { get; set; }
        [Required]
        public int days { get; set; }
        public int fyId { get; set; }
        public FascalYearModel? fy { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }

    }
    public class leaveTypeViewModel
    {
        public int? Id { get; set; }
        [Required]
        public string? type { get; set; }
        [Required]
        public int? days { get; set; }
        public int? fyId { get; set; }
        public FascalYearModel? fy { get; set; }
        public int? companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<LeaveTypeModel>? leaveTypes { get; set; }

    }
    public class LeaveNameModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
    }
    public class LeaveNameViewModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
        public List<LeaveNameModel> LeaveName { get; set; }
    }
}
