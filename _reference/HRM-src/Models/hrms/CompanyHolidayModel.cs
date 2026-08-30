using Microsoft.Identity.Client;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class CompanyHolidayModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; }
        public string name { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
    }
    public class CompanyHolidayViewModel
    {
        public int Id { get; set; }
        public DateTime? date { get; set; }
        public string name { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<CompanyHolidayModel> companyHolidays { get; set; }
    }
}
