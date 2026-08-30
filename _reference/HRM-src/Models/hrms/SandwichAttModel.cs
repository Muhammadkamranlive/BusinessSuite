using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class SandwichAttModel
    {
        [Key]
        public int Id { get; set; }
        public DateTime date { get; set; } = DateTime.Now;
        public DateTime from { get; set; }
        public DateTime to { get; set; }
        public string reason { get; set; }
        public string empId { get; set; }
        public ApplicationUser? emp { get; set; }

    }
    public class SandwichAttViewModel
    {
        public int Id { get; set; }
        public DateTime date { get; set; }
        public DateTime? from { get; set; }
        public DateTime? to { get; set; }
        public string reason { get; set; }
        public string empId { get; set; }
        public ApplicationUser emp { get; set; }
        public List<SandwichAttModel> sandwichatt  {get; set; }

    }
}
