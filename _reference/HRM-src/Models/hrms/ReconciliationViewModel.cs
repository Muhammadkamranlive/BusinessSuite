using itgsgroup.Areas.Identity.Data;

namespace itgsgroup.Models.hrms
{
    public class ReconciliationViewModel
    {
        public string Id { get; set; }
        public string name { get; set; }
        public int TotalDays { get; set; }
        public int Sundays { get; set; }
        public int Saturdays { get; set; }
        public int GazettedHolidaysCount { get; set; }
        public int CompanyHolidaysCount { get; set; }
        public int TotalWorkingDays { get; set; }
        public int PresentDays { get; set; }
        public string empId { get; set; }
        public ApplicationUser emp { get; set; }
    }
}
