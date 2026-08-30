namespace itgsgroup.Models.hrms
{
    public class DataReceived
    {
        public string machineId { get; set; }
        public string att_datetime { get; set; }
        public string attState { get; set; }
    }

    public class ToDayDataReceived
    {
        public int MachineNumber { get; set; }
        public int IndRegID { get; set; }
        public string DateTimeRecord { get; set; }
        public int AttState { get; set; }

        public DateTime DateOnlyRecord
        {
            get { return DateTime.Parse(DateTime.Parse(DateTimeRecord).ToString("yyyy-MM-dd")); }
        }
        public DateTime TimeOnlyRecord
        {
            get { return DateTime.Parse(DateTime.Parse(DateTimeRecord).ToString("hh:mm:ss tt")); }
        }
    }

}
