using itgsgroup.Areas.Identity.Data;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class COATModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; } = DateTime.Now;
        public DateTime correct_datetime { get; set; }
        public string reason { get; set; }
        public string status { get; set; }
        public string hrstatus { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        
    }
    public class COATViewModel
    {
        public int Id { get; set; }
        public DateTime date { get; set; } = DateTime.Now;
        public DateTime? correct_datetime { get; set; }
        public string reason { get; set; }
        public string status { get; set; }
        public string hrstatus { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<COATModel>? COATModel { get; set; }
      
    }
}
