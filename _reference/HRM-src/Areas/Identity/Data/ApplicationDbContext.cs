using itgsgroup.Areas.Identity.Data;
using itgsgroup.Models.hrms;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace itgsgroup.Areas.Identity.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    public DbSet<CompanyModel> companies { get; set; }
    public DbSet<DepartmentModel> departments { get; set; }
    public DbSet<DesignationModel> designations { get; set; }
    public DbSet<ShiftModel> shift { get; set; }
    public DbSet<EmpDocModel> empDocs { get; set; }
    public DbSet<EmpFamilyDocModel> empFamilyDocs { get; set; }
    public DbSet<EmpFamilyModel> empFamily { get; set; }
    public DbSet<FascalYearModel> fascalYears { get; set; }
    public DbSet<SalaryBreakupModel> salaryBreakup { get; set; }
    public DbSet<LocationsModel> locations { get; set; }
    public DbSet<SlabsModel> slabs { get; set; }
    public DbSet<LeaveTypeModel> leaveTypes { get; set; }
    public DbSet<LeaveApplyModel> leaveApplies { get; set; }
    public DbSet<LoanApplyModel> loanApplies { get; set; }
    public DbSet<COATModel> Correct_AttendTime { get; set; }
    public DbSet<rawattendanceModel> rawattendances { get; set; }
    public DbSet<tempMonthAttModel> tempMonthAtts { get; set; }
    public DbSet<DiciplinaryActionModel> diciplinaryActions {  get; set; }
    public DbSet<GazettedHolidayModel> gazettedHolidays { get; set; }
    public DbSet<CompanyHolidayModel> companyHolidays { get; set; }
    public DbSet<SandwichAttModel> sandwichAtts  { get; set; }
    public DbSet<LoanOpeningModel> loanOpenings { get; set; }
    public DbSet<EOBIModel> EOBIs { get; set; }
    public DbSet<PFModel> PFs { get; set; }
    public DbSet<LeaveNameModel> LeaveNames { get; set; }
    public DbSet<PayRollModel> payRolls { get; set; }
    public DbSet<ReconciliationViewModel> ReconciliationViewModels { get; set; }
    public DbSet<tempMonthAttViewModel> tempMonthAttViewModels { get; set; }
    public DbSet<DeductionCountViewModel> deductionCountViewModels { get; set; }
    public DbSet<LeaveCountViewModel> leaveCountViewModels { get; set; }
    public DbSet<LoanViewModel> loanViewModels { get; set; }
	public DbSet<empAttendViewModel> empAttendViewModels { get; set; }
    public DbSet<GetPakTime> getPakTime { get; set; }

	protected override void OnModelCreating(ModelBuilder builder)
    {
      

        base.OnModelCreating(builder);
        // Customize the ASP.NET Identity model and override the defaults if needed.
        // For example, you can rename the ASP.NET Identity table names and more.
        // Add your customizations after calling base.OnModelCreating(builder);
        // Configure the view models as database views
        builder.Entity<ReconciliationViewModel>().ToView("ReconciliationView");
        builder.Entity<tempMonthAttViewModel>().ToView("TempMonthAttView");
        builder.Entity<DeductionCountViewModel>().ToView("DeductionCountView");
        builder.Entity<LeaveCountViewModel>().ToView("LeaveCountView");
        builder.Entity<LoanViewModel>().ToView("LoanView");
		builder.Entity<empAttendViewModel>().ToView("empAttendView");
		builder.Entity<GetPakTime>().ToView("GetPakTimeView");
		builder.Entity<GetPakTime>().HasNoKey();
		builder.Entity<EOBIModel>()
       .HasOne(e => e.fy)
       .WithMany()
       .HasForeignKey(e => e.fyId)
       .OnDelete(DeleteBehavior.NoAction); // Specify ON DELETE NO ACTION



    }
}
