using System.ComponentModel.DataAnnotations;
using System.Security.Policy;

namespace itgsgroup.Models.hrms
{
    public class SalaryBreakupModel
    {
        [Key]
        public int Id { get; set; }
        public string name { get; set; }
        public int percent { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class SalaryBreakupViewModel
    {
        public int Id { get; set; }
        public string name { get; set; }
        public int percent { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<SalaryBreakupModel> salaryBreakups { get; set; }
    }
}
