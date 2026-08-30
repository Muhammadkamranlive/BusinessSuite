using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class EmpFamilyDocModel
    {
        [Key]
        public int Id { get; set; }
        public string filepath { get; set; }
        public string empId { get; set; }
        public ApplicationUser emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel company { get; set; }

    }
}
