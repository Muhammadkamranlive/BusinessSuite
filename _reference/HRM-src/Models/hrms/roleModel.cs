using Microsoft.AspNetCore.Identity;

namespace itgsgroup.Models.hrms
{
    public class roleModel
    {
        public IdentityRole identityRole { get; set; }
       public IEnumerable<IdentityRole>  identityRoles { get; set; }
    }
}
