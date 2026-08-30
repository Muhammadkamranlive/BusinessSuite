using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class PayRollModel
    {
        [Key]
        public int Id { get; set; }
        public int? companyId { get; set; }
        public string? monthYear { get; set; }
        public string? employeeId { get; set; }
        public string? employeeName { get; set; }
        public int? gross_salary { get; set; }
        public int? basic { get; set; }
        public int? hra { get; set; }
        public int? medical_all { get; set; }
        public int? con_all { get; set; }
        public int? utility_all { get; set; }
        public int? food_all { get; set; }
        public int? other_all { get; set; }
        public int? days { get; set; }
        public int? day_salary { get; set; }
        public int? deduction_count {get; set; }
        public int? att_deduction { get; set; }
        public int? pf { get; set; }
        public int? EOBI { get; set; }
        public DateTime? joining { get; set; }
        public int? incometax { get; set; }
        public  int? loan_deduction { get; set; }
        public int? sessi_deduction { get; set; }
        public int? other_deduction { get; set; }
        public int? arear { get; set; }
        public int? bonus { get; set; }
        public int? taxable_arear { get; set; }
        public string? remarks { get; set; }
        public string? CPR { get; set; }
        public int? total_deduction { get; set; }
        public int? total_addition { get; set; }
        public int? net_salary { get; set; }
        public ApplicationUser employee { get; set; }
        public CompanyModel company { get; set; }
    }
}
