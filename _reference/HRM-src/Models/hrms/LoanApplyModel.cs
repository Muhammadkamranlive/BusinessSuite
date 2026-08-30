using itgsgroup.Areas.Identity.Data;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class LoanApplyModel
    {
        [Key]
        public int Id { get; set; }
        public int loanamount { get; set; }
        public int repaymentamount { get; set; }
        public DateTime startdate { get; set; }
        public string reason { get; set; }
        public string status { get; set; }
        public string hrstatus { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        
    }
    public class LoanApplyViewModel
    {
        public int Id { get; set; }
        public int loanamount { get; set; }
        public int repaymentamount { get; set; }
        public DateTime? startdate { get; set; }
        public string reason { get; set; }
        public string status { get; set; }
        public string hrstatus { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
        public int companyId { get; set; }
        public CompanyModel? company { get; set; }
        public List<LoanApplyModel>? loanApply { get; set; }
      
    }

    public class LoanViewModel
    {
        public int Id { get; set; }
        public DateTime date { get; set; }
        public string narration { get; set; }
        public int? received { get; set; }
        public int? pay { get; set; }
        public int balance { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }
     

    }

}
