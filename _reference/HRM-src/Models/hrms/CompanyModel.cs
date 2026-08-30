using itgsgroup.Areas.Identity.Data;
using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class CompanyModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string name { get; set; }
        public string? ntn { get; set; }
        public string? stax { get; set; }
        [Required]
        public string? address { get; set; }
        [Required]
        public int LocId { get; set; }
        public LocationsModel? Loc { get; set; }
		public ICollection<ApplicationUser> AspNetUsers { get; set; }


	}
    public class CompanyViewModel
    {
        public int? Id { get; set; }
        [Required]
        public string? name { get; set; }
        public string? ntn { get; set; }
        public string? stax { get; set; }
        [Required]
        public string? address { get; set; }
        [Required]
        public int? LocId { get; set; }
        public LocationsModel? Loc { get; set; }
        public List<CompanyModel>? companyModels { get; set; }

    }
}
