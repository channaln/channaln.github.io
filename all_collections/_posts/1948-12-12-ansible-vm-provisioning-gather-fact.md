---
layout: post
title: Decide a given name of a Virtual Machine that already exists in the Vcenter
date: 2024-02-10
categories: [Ansible]

---
#### Overview
This guide will demonstrate the simplest and most secure method for using Ansible to create Virtual Machines in VMWare, with helpful examples.In the realm of automation within a production environment, it is prudent to adhere to certain prerequisites before executing any task. For instance, if you manually provisioned a virtual machine using vCenter, it is advisable to verify the specific name you intend to assign to the new VM that is to be created. This precaution ensures clarity and accuracy throughout the automation process, fostering a smoother workflow and minimizing potential errors. In this post, you can learn how to do that

---
#### Methods
1. Check the Virtual Machine name already exists in the vCenter
2. Gather all the available Virtual Machines information and check the Virtual Machine name exists

Initially, one might assume these two methods are identical, yet they are distinct in nature, each harboring its own set of advantages and disadvantages. It's imperative to discern between the two to fully appreciate their individual merits and shortcomings.

---
#### Method 01 : Check the Virtual Machine name already exists in the vCenter

>This approach involves a direct search for the specified virtual machine name within VCenter. If the name is found, the task proceeds to gather information exclusively pertaining to that particular virtual machine. However, if the specified name is not present, the task will fail to execute.

**There are some benefits you can take using this method**
1. In this method only the Virtual Machine name will be searched in the Vcenter, It means the task will not take much time to gather the information.
2. Information is gathered in this way much easier to isolate and use to write conditions 

**Identified Limitations**
When assigning IPs during provisioning, it's important to note that there isn't a straightforward method to validate whether a given IP address has already been assigned to a virtual machine or not. This lack of direct validation can potentially introduce complexities into the provisioning process and necessitates careful consideration to avoid IP conflicts or misconfigurations.

**Recommendations**
- Perfectly suited and much faster for the environment with DHCP 

**The Playbook Task**
>Just imagine that now you are creating a new virtual machine. The first thing you are doing is providing a name. Let's say we provide that name using an Ansible variable called _"vmware_name"_.

{% raw %}
```yml
---
# You can use this way on both the Aansible Automation Platform and in terminal.
# If this needs to work inside of the terminal, you have to first execute below commands with your VCenter credentialsor use can replase varibales with the values.
# export VMWARE_HOST=replace.your_vcenter_name.com export VMWARE_USER=administrator@your_vcenter_name.com export VMWARE_PASSWORD=replase_with_your_user_password 
- name: Gather one specific VM's information
  community.vmware.vmware_vm_info:
    hostname: '{{ lookup("env", "VMWARE_HOST") }}'
    username: '{{ lookup("env", "VMWARE_USER") }}'
    password: '{{ lookup("env", "VMWARE_PASSWORD") }}'
    validate_certs: false
    vm_name: "{{ vmware_name }}"
  delegate_to: localhost
  register: vm_facts
  
```
{% endraw %}

#### Method 02 : Gather all the available Virtual Machines information and check the Virtual Machine name exists
> This method involves gathering information about all the virtual machines present within the VCenter. Subsequently, a conditional check is necessary to validate whether the given name is already in use. This ensures that no naming conflicts arise during the provisioning process
So I think you are ready to see some Ansible actions. You might need to open your VSCode. 

**There are some benefits you can take using this method**
1. In utilizing this method, comprehensive information including names, IPs, and other relevant details of all existing virtual machines within the VCenter can be gathered.  This information facilitates the validation process for names, IPs, or any other parameters essential before provisioning a new virtual machine. This method provides additional protection.

**Identified Limitations**
1. This is much slo
2. writing conditions might complicated using gathered data

**Recommendations**
- Perfectly suited for the environment with static IP address and critical environments

**The Playbook Task**
>Just imagine that now you are creating a new virtual machine. The first thing you are doing is providing a name. Let's say we provide that name using an Ansible variable called _"vmware_name"_.

**The gather all available virtual machines task**
{% raw %}
```yml
---
# You can use this way on both the Aansible Automation Platform and in terminal.
# If this needs to work inside of the terminal, you have to first execute below commands with your VCenter credentialsor use can replase varibales with the values.
# export VMWARE_HOST=replace.your_vcenter_name.com export VMWARE_USER=administrator@your_vcenter_name.com export VMWARE_PASSWORD=replase_with_your_user_password 
- name: Gather all available vms info
  community.vmware.vmware_vm_info:
    hostname: '{{ lookup("env", "VMWARE_HOST") }}' 
    username: '{{ lookup("env", "VMWARE_USER") }}'
    password: '{{ lookup("env", "VMWARE_PASSWORD") }}'
    validate_certs: false
  delegate_to: localhost
  register: vm_facts  
```
{% endraw %}

**check the given name and IP exist**
{% raw %}
```yml
---
- name: Check if VM with the same name or IP exists
  set_fact:
    vm_with_given_name_exists: "{{ item.guest_name == vmware_name }}"
    vm_with_given_ip_exists: "{{ item.ip_address == vmware_ip }}"
  loop: "{{ vm_facts.virtual_machines | default([]) }}"
  when: item.guest_name == vmware_name or item.ip_address == vmware_ip
  no_log: true

- name: Fail if VM with the same name or IP exists
  debug:
    msg: |
      {% if not vmware_name or not vmware_ip %}
      You did not declare the VM name or IP.
      {% elif vm_with_given_name_exists and vm_with_given_ip_exists %}
      The VM you are trying to create is already created with the SAME IP AND NAME ---> IP=[{{ vmware_ip }}] VM Name=[{{ vmware_name }}]
      {% elif vm_with_given_ip_exists %}
      The IP address assigned to another VM check the IP Address ---> IP=[{{ vmware_ip }}] 
      {% elif vm_with_given_name_exists %}
      The VM name assigned to another VM check the VM Name (___WORNING: THIS PERTICULER VM MIGHT BE POWED OF CHECK THE IP___) ---> VM Name=[{{ vmware_name }}]  
      {% endif %}
  register: vm_facts  
```
{% endraw %}

#### Comple ANsible Role
[Click here to get complte role - First Method](https://github.com/channaln/website-roles/tree/main/VMware/redhat_virtual_machine-%20First_Method).
[Click here to get complte role - First Method](https://github.com/channaln/website-roles/tree/main/VMware/redhat_virtual_machine-%20Second_Method).

#### Reference
Check out the official OpenShift documentation for more information.
- _italic_ https://docs.ansible.com/ansible/latest/collections/community/vmware/index.html
- _italic_ https://docs.ansible.com/ansible/latest/collections/community/vmware/vmware_guest_module.html