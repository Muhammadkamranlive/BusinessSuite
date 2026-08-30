using itgsgroup.Areas.Identity.Data;

namespace itgsgroup.Models.hrms
{
    public class DeductionCountViewModel
    {
        public string Id { get; set; }
        public int Late { get; set; }
        public int Absent { get; set; }
        public int DiciplinaryAction { get; set; }
        public int TotalDeduction { get; set; }
        public string empId { get; set; }
        public ApplicationUser emp { get; set; }
    }
}
