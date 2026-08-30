using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class DesignationModel
    {
        [Key]
        public int Id { get; set; }
        public string name { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set;}
    }
    public class designationViewModel
    {
        public int Id { get; set; }
        public string name { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<DesignationModel>? designations { get; set; }
    }
}
