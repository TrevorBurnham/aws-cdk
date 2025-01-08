import { CfnIPAM, CfnIPAMPool, CfnIPAMPoolCidr, CfnIPAMScope } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Lazy, Names, Resource, Stack, Tags } from 'aws-cdk-lib';

/**
 * Represents the address family for IP addresses in an IPAM pool.
 * IP_V4 - Represents the IPv4 address family.
 * IP_V6 - Represents the IPv6 address family.
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html#cfn-ec2-ipampool-addressfamily
 */
export enum AddressFamily {
  /**
   * Represents the IPv4 address family.
   * Allowed under public and private pool.
   */
  IP_V4 = 'ipv4',

  /**
   * Represents the IPv6 address family.
   * Only allowed under public pool.
   */
  IP_V6 = 'ipv6',
}

/**
 * The IP address source for pools in the public scope.
 * Only used for provisioning IP address CIDRs to pools in the public scope.
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html#cfn-ec2-ipampool-publicipsource
 */
export enum IpamPoolPublicIpSource {
  /**
   * BYOIP Ipv6 to be registered under IPAM
   */
  BYOIP = 'byoip',

  /**
   * Amazon Provided Ipv6 range
   */
  AMAZON = 'amazon',
}

/**
 * Limits which service in AWS that the pool can be used in
 */
export enum AwsServiceName {
  /**
   *  Allows users to use space for Elastic IP addresses and VPCs
   */
  EC2 = 'ec2',
}

/**
 * Options to create a new Ipam in the account
 */
export interface IpamProps {

  /**
   * The operating Regions for an IPAM.
   * Operating Regions are AWS Regions where the IPAM is allowed to manage IP address CIDRs
   * For more information about operating Regions, see [Create an IPAM](https://docs.aws.amazon.com//vpc/latest/ipam/create-ipam.html) in the *Amazon VPC IPAM User Guide* .
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipam.html#cfn-ec2-ipam-operatingregions
   *
   * @default - Stack.region if defined in the stack
   */
  readonly operatingRegion?: string[];

  /**
   * Name of IPAM that can be used for tagging resource
   *
   * @default - If no name provided, no tags will be added to the IPAM
   */
  readonly ipamName?: string;
}

/**
 * Refers to two possible scope types under IPAM
 */
export enum IpamScopeType {
  /**
   * Default scopes created by IPAM
   */
  DEFAULT = 'default',

  /**
   * Custom scope created using method
   */
  CUSTOM = 'custom',
}

/**
 * Options for configuring an IPAM pool.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html
 */
export interface PoolOptions {

  /**
   * addressFamily - The address family of the pool (ipv4 or ipv6).
   */
  readonly addressFamily: AddressFamily;

  /**
   * Information about the CIDRs provisioned to the pool.
   *
   * @default - No CIDRs are provisioned
   */
  readonly ipv4ProvisionedCidrs?: string[];

  /**
   * The locale (AWS Region) of the pool. Should be one of the IPAM operating region.
   *  Only resources in the same Region as the locale of the pool can get IP address allocations from the pool.
   * You can only allocate a CIDR for a VPC, for example, from an IPAM pool that shares a locale with the VPC’s Region.
   * Note that once you choose a Locale for a pool, you cannot modify it. If you choose an AWS Region for locale that has not been configured as an operating Region for the IPAM, you'll get an error.
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html#cfn-ec2-ipampool-locale
   *
   * @default - Current operating region of IPAM
   */
  readonly locale?: string;

  /**
   * The IP address source for pools in the public scope.
   * Only used for IPv6 address
   * Only allowed values to this are 'byoip' or 'amazon'
   *
   * @default amazon
   */
  readonly publicIpSource?: IpamPoolPublicIpSource;

  /**
  * Limits which service in AWS that the pool can be used in.
  *
  * "ec2", for example, allows users to use space for Elastic IP addresses and VPCs.
  *
  * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html#cfn-ec2-ipampool-awsservice
  *
  * @default - required in case of an IPv6, throws an error if not provided.
  */
  readonly awsService?: AwsServiceName;

  /**
   * IPAM Pool resource name to be used for tagging
   *
   * @default - autogenerated by CDK if not provided
   */
  readonly ipamPoolName?: string;
}

const NAME_TAG: string = 'Name';

/**
 * Properties for creating an IPAM pool.
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html
 */
interface IpamPoolProps extends PoolOptions {
  /**
   * Scope id where pool needs to be created
   */
  readonly ipamScopeId: string;
}

/**
 * Options to provision CIDRs to an IPAM pool.
 * Used to create a new IpamPoolCidr
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampoolcidr.html
 */
export interface IpamPoolCidrProvisioningOptions {
  /**
   * Ipv6 Netmask length for the CIDR
   *
   * @default - pool provisioned without netmask length, need cidr range in this case
   */
  readonly netmaskLength?: number;

  /**
   * Ipv6 CIDR block for the IPAM pool
   *
   * @default - pool provisioned without netmask length, need netmask length in this case
   */
  readonly cidr?: string;
}

/**
 * Definition used to add or create a new IPAM pool
 */
export interface IIpamPool {
  /**
 * Pool ID to be passed to the VPC construct
 * @attribute IpamPoolId
 */
  readonly ipamPoolId: string;

  /**
   * Pool CIDR for IPv6 to be provisioned with Public IP source set to 'Amazon'
   */
  readonly ipamCidrs: CfnIPAMPoolCidr[];

  /**
   * Pool CIDR for IPv4 to be provisioned using IPAM
   * Required to check for subnet IP range is within the VPC range
   */
  readonly ipamIpv4Cidrs?: string[];

  /**
   * Function to associate a IPv6 address with IPAM pool
   */
  provisionCidr(id: string, options: IpamPoolCidrProvisioningOptions): CfnIPAMPoolCidr;

}

/**
 * IPAM scope is the highest-level container within IPAM. An IPAM contains two default scopes.
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipamscope.html
 */
interface IpamScopeProps extends IpamScopeOptions {
  /**
   * IPAM id to which scope needs to be added
   */
  readonly ipamId: string;

  /**
   * Operating regions for the Ipam
   * Required in order to validate the locale being set on pool
   */
  readonly ipamOperatingRegions: string[];

  /**
   * Custom ipam scope id to add a pool in order to support default scopes
   *
   * @default - throws an error if no scope id is provided
   */
  readonly ipamScopeId?: string;

}

/**
 * Being used in IPAM class to add pools to default scope created by IPAM.
 */
export interface IpamScopeOptions {

  /**
   * IPAM scope name that will be used for tagging
   *
   * @default - no tags will be added to the scope
   */
  readonly ipamScopeName?: string;
}

/**
 * Options for configuring an IP Address Manager (IPAM).
 *
 * For more information, see the {@link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipam.html}.
 */
export interface IpamOptions {

  /**
   * CIDR Mask for Vpc
   * Only required when using AWS Ipam
   *
   * @default - no netmask length for IPAM attached to VPC secondary address
   */
  readonly netmaskLength?: number;

  /**
   * Ipv4 or an Ipv6 IPAM pool
   * Only required when using AWS Ipam
   *
   * @default - no pool attached to VPC secondary address
   */
  readonly ipamPool?: IIpamPool;

  /**
   * Required to set Secondary cidr block resource name
   * in order to generate unique logical id for the resource.
   */
  readonly cidrBlockName: string;
}

/**
 * Interface for IpamScope Class
 */
export interface IIpamScopeBase {

  /**
   * Reference to the current scope of stack to be passed in order to create
   * a new IPAM pool
   */
  readonly scope: Construct;

  /**
   * Default Scope ids created by the IPAM or a new Resource id
   */
  readonly scopeId: string;

  /**
   * Defines scope type can be either default or custom
   */
  readonly scopeType?: IpamScopeType;

  /**
   * Function to add a new pool to an IPAM scope
   */
  addPool(id: string, options: PoolOptions): IIpamPool;

}

/**
 * Creates new IPAM Pool
 * Pools enable you to organize your IP addresses according to your routing and security needs
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipampool.html
 * @resource AWS::EC2::IPAMPool
 * @internal
 */
class IpamPool extends Resource implements IIpamPool {

  /**
   * Pool ID to be passed to the VPC construct
   * @attribute IpamPoolId
   */
  public readonly ipamPoolId: string;

  /**
   * Pool CIDR for IPv6 to be provisioned with Public IP source set to 'Amazon'
   */
  public readonly ipamCidrs: CfnIPAMPoolCidr[] = [];

  /**
   * Pool CIDR for IPv4 to be provisioned using IPAM
   * Required to check for subnet IP range is within the VPC range
   */
  public readonly ipamIpv4Cidrs: string[] = [];

  /**
   * Reference to ipamPool resource created in this class
   */
  private readonly _ipamPool: CfnIPAMPool;

  constructor(scope: Construct, id: string, props: IpamPoolProps) {
    super(scope, id, {
      physicalName: props.ipamPoolName ?? Lazy.string({
        produce: () => Names.uniqueResourceName(this, { maxLength: 128, allowedSpecialCharacters: '_' }),
      }),
    });

    if (props.addressFamily === AddressFamily.IP_V6 && !props.awsService) {
      throw new Error('awsService is required when addressFamily is set to ipv6');
    }

    //Add tags to the IPAM Pool if name is provided
    if (props.ipamPoolName) {
      Tags.of(this).add(NAME_TAG, props.ipamPoolName);
    }

    this._ipamPool = new CfnIPAMPool(this, id, {
      addressFamily: props.addressFamily,
      provisionedCidrs: props.ipv4ProvisionedCidrs?.map(cidr => ({ cidr })),
      locale: props.locale,
      ipamScopeId: props.ipamScopeId,
      publicIpSource: props.publicIpSource,
      awsService: props.awsService,
    });
    this.ipamPoolId = this._ipamPool.attrIpamPoolId;

    // Populating to check for subnet range against all IPv4 ranges assigned to VPC including IPAM
    props.ipv4ProvisionedCidrs?.map(cidr => (this.ipamIpv4Cidrs.push(cidr)));
    this.node.defaultChild = this._ipamPool;
  }

  /**
   * A CIDR provisioned to an IPAM pool.
   * @param id Name of Resource
   * @param options Either a CIDR or netmask length must be provided
   * @returns AWS::EC2::IPAMPoolCidr
   */
  public provisionCidr(id: string, options: IpamPoolCidrProvisioningOptions): CfnIPAMPoolCidr {
    const cidr = new CfnIPAMPoolCidr(this, id, {
      ...options,
      ipamPoolId: this.ipamPoolId,
    });
    this.ipamCidrs.push(cidr);
    return cidr;
  }
}

/**
 * Creates custom Ipam Scope, custom IPAM scopes can only be private
 * (can be used for adding custom scopes to an existing IPAM)
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipamscope.html
 * @resource AWS::EC2::IPAMScope
 */
class IpamScope extends Resource implements IIpamScopeBase {

  /**
   * Stores the reference to newly created Resource
   */
  private readonly _ipamScope: CfnIPAMScope;

  /**
   * ID for Resource IpamScope
   * @attribute IpamScopeId
   */
  public readonly scopeId: string;

  /**
   * Properties to configure ipam scope
   */
  private readonly props: IpamScopeProps;

  /**
   * Reference to stack scope to be passed through addPool method inorder to create a new IpamPool
   */
  public readonly scope: Construct;

  /**
   * Defines scope type can be either default or custom
   */
  public readonly scopeType: IpamScopeType;

  constructor(scope: Construct, id: string, props: IpamScopeProps) {
    super(scope, id);
    this._ipamScope = new CfnIPAMScope(scope, 'IpamScope', {
      ipamId: props.ipamId,
    });
    Tags.of(this._ipamScope).add(NAME_TAG, props.ipamScopeName ?? 'CustomIpamScope');
    this.scopeId = this._ipamScope.attrIpamScopeId;
    this.scopeType = IpamScopeType.CUSTOM;
    this.scope = scope;
    this.props = props;
  }

  /**
   * Adds a pool to the IPAM scope.
   * @external
   */
  addPool(id: string, options: PoolOptions): IIpamPool {
    return createIpamPool(this.scope, id, this.props, options, this.scopeId);
  }

}

/**
 * Base class for IPAM default scopes.
 */
class IpamScopeBase implements IIpamScopeBase {
  constructor(
    readonly scope: Construct,
    readonly scopeId: string,
    private readonly props: IpamScopeProps,
    readonly scopeType?: IpamScopeType,
  ) {
    this.scopeType = IpamScopeType.DEFAULT;
    if (!props.ipamScopeId) {
      throw new Error('ipamScopeId is required');
    } else {
      this.scopeId = props.ipamScopeId;
    }
  }

  /**
   * Adds a pool to the IPAM scope.
   * @external
   */
  addPool(id: string, options: PoolOptions): IIpamPool {
    return createIpamPool(this.scope, id, this.props, options, this.scopeId);
  }
}

/**
 * Creates new IPAM with default public and private scope
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipamscope.html
 * @resource AWS::EC2::IPAM
 */
export class Ipam extends Resource {
  /**
 * Provides access to default public IPAM scope through add pool method.
 * Usage: To add an Ipam Pool to a default public scope
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipamscope.html
 */
  public readonly publicScope: IIpamScopeBase;

  /**
   * Provides access to default private IPAM scope through add pool method.
   * Usage: To add an Ipam Pool to a default private scope
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-ipamscope.html
   * */
  public readonly privateScope: IIpamScopeBase;

  // Resource IPAM
  private readonly _ipam: CfnIPAM;
  /**
   * Access to Ipam resource id that can be used later to add a custom private scope to this IPAM
   * @attribute IpamId
   */
  public readonly ipamId: string;

  /**
   * List of operating regions for IPAM
   */
  public readonly operatingRegions: string[];

  /**
   * List of scopes created under this IPAM
   */
  public readonly scopes: IIpamScopeBase[] = [];

  /**
   * IPAM name to be used for tagging
   * @default no tag specified
   * @attribute IpamName
   */
  public readonly ipamName?: string;

  constructor(scope: Construct, id: string, props?: IpamProps) {
    super(scope, id);
    if (props?.ipamName) {
      Tags.of(this).add(NAME_TAG, props.ipamName);
    }
    if (!props?.operatingRegion && !Stack.of(this).region) {
      throw new Error('Please provide at least one operating region');
    }

    this.operatingRegions = props?.operatingRegion ?? [Stack.of(this).region];
    this.ipamName = props?.ipamName;

    this._ipam = new CfnIPAM(this, 'Ipam', {
      operatingRegions: this.operatingRegions ? this.operatingRegions.map(region => ({ regionName: region })) : [],
    });
    this.node.defaultChild = this._ipam;

    this.ipamId = this._ipam.attrIpamId;
    this.publicScope = new IpamScopeBase(this, 'DefaultPublicScope', {
      ipamOperatingRegions: this.operatingRegions,
      ipamId: this._ipam.attrIpamId,
      ipamScopeId: this._ipam.attrPublicDefaultScopeId,
    });
    this.privateScope = new IpamScopeBase(this, 'DefaultPrivateScope', {
      ipamOperatingRegions: this.operatingRegions,
      ipamId: this._ipam.attrIpamId,
      ipamScopeId: this._ipam.attrPrivateDefaultScopeId,
    });

    this.scopes.push(this.publicScope, this.privateScope);

  }

  /**
   * Function to add custom scope to an existing IPAM
   * Custom scopes can only be private
   */
  public addScope(scope: Construct, id: string, options: IpamScopeOptions): IIpamScopeBase {
    const ipamScope = new IpamScope(scope, id, {
      ...options,
      ipamId: this.ipamId,
      ipamOperatingRegions: this.operatingRegions,
    });
    this.scopes.push(ipamScope);
    return ipamScope;
  }
}

/**
 * Function to create IpamPool under scope
 * @internal
 */
function createIpamPool(
  scope: Construct,
  id: string,
  scopeOptions: IpamScopeProps,
  poolOptions: PoolOptions,
  scopeId: string,
): IpamPool {
  const isLocaleInOperatingRegions = scopeOptions.ipamOperatingRegions
    ? scopeOptions.ipamOperatingRegions.map(region => ({ regionName: region }))
      .some(region => region.regionName === poolOptions.locale)
    : false;

  if (!isLocaleInOperatingRegions) {
    throw new Error(`The provided locale '${poolOptions.locale}' is not in the operating regions.`);
  }

  return new IpamPool(scope, id, {
    ipamPoolName: poolOptions.ipamPoolName,
    addressFamily: poolOptions.addressFamily,
    ipv4ProvisionedCidrs: poolOptions.ipv4ProvisionedCidrs,
    ipamScopeId: scopeId,
    locale: poolOptions.locale,
    publicIpSource: poolOptions.publicIpSource,
    awsService: poolOptions.awsService,
  });
}

