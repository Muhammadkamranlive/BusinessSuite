using System.ComponentModel.DataAnnotations;

namespace itgsgroup.Models.hrms
{
    public class LocationsModel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string name { get; set; }

    }
    public class locationViewModel
    {
        public int Id { get; set; }
        [Required]
        public string name { get; set; }
        public List<LocationsModel>? locations { get; set; }
    }
}
