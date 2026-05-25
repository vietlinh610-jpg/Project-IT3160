document.addEventListener('DOMContentLoaded', function () {
    const collapsibleTriggers = document.querySelectorAll('.collapsible-trigger');

    collapsibleTriggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            const content = this.nextElementSibling;
            const isActive = this.classList.contains('active'); 

            closeOtherCollapsibles(this); 

            if (!isActive) {
                this.classList.add('active');
                content.style.display = "block";
            }
        });
    });

    function closeOtherCollapsibles(currentTrigger) {
        collapsibleTriggers.forEach(trigger => {
            if (trigger !== currentTrigger || trigger.classList.contains('active')) {
                const content = trigger.nextElementSibling;
                  if (content && content.style.display !== "none") { 
                    trigger.classList.remove('active');
                    content.style.display = "none";
                }
            }
        });
    }
});
