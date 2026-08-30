using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{

    public class LoanOpeningModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; }
        public int opening { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }


    }
    public class LoanOpeningViewModel
    {
        public int Id { get; set; }
        public DateTime? date { get; set; }
        public int opening { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public List<LoanOpeningModel> loanopening { get; set; }


    }
}
