using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class rawattendanceModel
    {
        [Key]
        public int id { get; set; }
        public string empId { get; set; }
        public DateTime att_datetime { get; set; }
        public string AttState { get; set; }
        public ApplicationUser? emp { get; set; }
     }
}
