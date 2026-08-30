using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class SlabsModel
    {
        [Key]
        public int Id { get; set; }
        public int from { get; set; }
        [RegularExpression(@"^[0-8]?(\d{1,9})?$", ErrorMessage = "Please enter a number less than 999999999.")]
        public int to { get; set; }
        public float percent { get; set; }
        public int extra { get; set; }
        public int fyId { get; set; }
        public FascalYearModel? fy { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class SlabsViewModel
    {
        public int Id { get; set; }
        public int from { get; set; }
        [RegularExpression(@"^[0-8]?(\d{1,9})?$", ErrorMessage = "Please enter a number less than 999999999.")]
        public int to { get; set; }
        public float percent { get; set; }
        public int extra { get; set; }
        public int fyId { get; set; }
        public FascalYearModel? fy { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<SlabsModel> Slabs { get; set; }
    }
}
