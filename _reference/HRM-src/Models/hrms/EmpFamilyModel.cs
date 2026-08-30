using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class EmpFamilyModel
    {
        [Key]
        public int Id { get; set; }
        public string name { get; set; }
        public string relation { get; set; }
        public DateTime? DOB { get; set; }
        public string cnic { get; set; }
        public DateTime? cnic_expiry { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class empFamilyViewModel
    {
        public int Id { get; set; }
        public string name { get; set; }
        public string relation { get; set; }
        public DateTime? DOB { get; set; }
        public string cnic { get; set; }
        public DateTime? cnic_expiry { get; set; }
        public string empId { get; set; }
        public int companyId { get; set; }
        public List<IFormFile>? filepath { get; set; }
        public IEnumerable<EmpFamilyModel>? empFamilyModels { get; set; }
        public IEnumerable<EmpFamilyDocModel>? empFamilyDocModels { get; set; }


    }
}
