using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class DiciplinaryActionModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime ActionDate { get; set; }
        public string reason { get; set; }
        public string empId { get; set; }
        public int? companyId { get; set; }
        public ApplicationUser? emp {  get; set; }
        public CompanyModel? company { get; set; }
    }

    public class DiciplinaryActionViewModel
    {
        public int Id { get; set; }
        public DateTime? ActionDate { get; set; }
        public string reason { get; set; }
        public string empId { get; set; }
        public int? companyId { get; set; }
        public ApplicationUser? emp { get; set; }
        public CompanyModel? company { get; set; }
        public List<DiciplinaryActionModel> diciplnaryAction { get; set; }
    }
}
