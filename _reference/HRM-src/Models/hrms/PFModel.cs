using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class PFModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; } 
        public float percent { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class PFViewModel
    {
        public int Id { get; set; }
        public DateTime? date { get; set; } 
        public float percent { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<PFModel> PF { get; set; }
    }
}
