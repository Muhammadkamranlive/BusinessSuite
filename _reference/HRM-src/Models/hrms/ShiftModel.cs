using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class ShiftModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public TimeSpan from { get; set; }
        [Required]
        public TimeSpan to { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }

    }
    public class ShiftViewModel
    {
        public int Id { get; set; }
        [Required]
        public TimeSpan? from { get; set; }
        [Required]
        public TimeSpan? to { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<ShiftModel> shifts { get; set; }

    }
}
