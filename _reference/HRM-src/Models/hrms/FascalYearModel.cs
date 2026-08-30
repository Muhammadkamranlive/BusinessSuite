using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class FascalYearModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public DateTime from { get; set; }
        [Required]
        public DateTime to { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class fascalYearViewModel
    {
        public int Id { get; set; }
        [Required]
        public DateTime? from { get; set; }
        [Required]
        public DateTime? to { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<FascalYearModel> fascalYears { get; set; }  
    }
}
