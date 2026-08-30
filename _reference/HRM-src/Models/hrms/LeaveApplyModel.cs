using itgsgroup.Areas.Identity.Data;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class LeaveApplyModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime from { get; set; }
        public DateTime to { get; set; }
        public int days { get; set; }
        public string status { get; set; }
        public string hrstatus { get; set; }
        public int leaveId { get; set; }
        public LeaveTypeModel? leave { get; set; }
        public string reason { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        
    }
    public class LeaveApplyViewModel
    {
        public int Id { get; set; }
        public DateTime? from { get; set; }
        public DateTime? to { get; set; }
        public int days { get; set; }
        public string status { get; set; }
        public string hrstatus { get; set; }
        public int leaveId { get; set; }
        public LeaveTypeModel? leave { get; set; }
        public string reason { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<LeaveApplyModel>? leaveApply { get; set; }
      
    }
}
