using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class EOBIModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; } 
        public int amount { get; set; }
        public  int fyId { get; set; }
        public FascalYearModel? fy { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class EOBIViewModel
    {
        public int Id { get; set; }
        public DateTime? date { get; set; } 
        public int amount { get; set; }
        public int fyId { get; set; }
        public FascalYearModel? fy { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<EOBIModel> EOBI { get; set; }
    }
}
